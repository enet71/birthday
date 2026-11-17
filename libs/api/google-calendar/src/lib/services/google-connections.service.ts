import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { GoogleCalendarConnectionDto } from '@birthday/shared-models';
import { DATABASE, Database, googleCalendarConnections } from '@birthday/api-database';
import { GoogleAccessRevokedError } from '../errors';
import { GoogleOAuthService } from './google-oauth.service';
import { TokenCipher } from './token-cipher.service';

const connections = googleCalendarConnections;

// The user's Google Calendar connection and the access it holds. The refresh token is decrypted only here and never
// leaves the API.
@Injectable()
export class GoogleConnectionsService {
  private readonly logger = new Logger(GoogleConnectionsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly oauth: GoogleOAuthService,
    private readonly cipher: TokenCipher,
  ) {}

  public async find(userId: string): Promise<GoogleCalendarConnectionDto | null> {
    const [connection] = await this.db
      .select({ status: connections.status, lastSyncedAt: connections.lastSyncedAt })
      .from(connections)
      .where(eq(connections.userId, userId));

    return connection ? { status: connection.status, lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null } : null;
  }

  // No birthday points to an event after a disconnect, so there are no deletions to read yet. `lastPulledAt` makes the
  // automatic sync the app starts right away wait, so it cannot take the lease from the first sync, which ignores it.
  public async saveConnected(userId: string, refreshToken: string): Promise<void> {
    const now = new Date();
    const values = {
      status: 'connected' as const,
      connectedAt: now,
      lastPulledAt: now.toISOString(),
      deletionsCheckedAt: '-infinity',
      refreshTokenEncrypted: this.cipher.encrypt(refreshToken),
    };

    await this.db
      .insert(connections)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: connections.userId, set: values });
  }

  public async isConnected(userId: string): Promise<boolean> {
    const [connection] = await this.db.select({ status: connections.status }).from(connections).where(eq(connections.userId, userId));

    return connection?.status === 'connected';
  }

  public async markDisconnected(userId: string): Promise<void> {
    await this.db.update(connections).set({ status: 'disconnected' }).where(eq(connections.userId, userId));
  }

  public async markSynced(userId: string): Promise<void> {
    await this.db.update(connections).set({ lastSyncedAt: new Date() }).where(eq(connections.userId, userId));
  }

  // `null` also for a token that cannot be decrypted, for example after `GOOGLE_TOKEN_ENCRYPTION_KEY` changed: it is as
  // good as lost, so the user has to connect again.
  public async readRefreshToken(userId: string): Promise<string | null> {
    const [connection] = await this.db
      .select({ refreshTokenEncrypted: connections.refreshTokenEncrypted })
      .from(connections)
      .where(eq(connections.userId, userId));

    if (!connection?.refreshTokenEncrypted) {
      return null;
    }

    try {
      return this.cipher.decrypt(connection.refreshTokenEncrypted);
    } catch (error) {
      this.logger.warn({ err: error }, 'A saved Google refresh token cannot be decrypted; the user has to connect again');
      return null;
    }
  }

  public async forgetRefreshToken(userId: string): Promise<void> {
    await this.db.update(connections).set({ refreshTokenEncrypted: null }).where(eq(connections.userId, userId));
  }

  // A fresh access token for the Calendar and People APIs. Throws `GoogleAccessRevokedError` and marks the connection
  // `revoked` when Google no longer accepts the saved access.
  public async getAccessToken(userId: string): Promise<string> {
    const refreshToken = await this.readRefreshToken(userId);

    if (!refreshToken) {
      await this.markRevoked(userId);
      throw new GoogleAccessRevokedError('No Google refresh token is saved');
    }

    const tokens = await this.oauth.refreshAccessToken(refreshToken);

    if (!tokens) {
      await this.markRevoked(userId);
      throw new GoogleAccessRevokedError('Google revoked the access');
    }
    // A connection made before Birthdly needed today's scopes has to be connected again.
    if (tokens.scope && !this.oauth.hasRequiredScopes(tokens.scope)) {
      await this.markRevoked(userId);
      throw new GoogleAccessRevokedError('The Google access lacks a required scope');
    }
    return tokens.accessToken;
  }

  // Only a still-connected user is marked: a disconnect may have revoked the token on purpose.
  private async markRevoked(userId: string): Promise<void> {
    await this.db
      .update(connections)
      .set({ status: 'revoked' })
      .where(and(eq(connections.userId, userId), eq(connections.status, 'connected')));
  }
}
