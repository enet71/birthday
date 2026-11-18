import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, eq, lt, lte } from 'drizzle-orm';
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

  // Deletions are read only from now on: an event the user deleted while disconnected (its id is kept when a disconnect
  // leaves the events in Google) is created again by the first sync's reconcile instead of deleting the birthday.
  // `lastPulledAt` makes the automatic sync the app starts right away wait, so it cannot take the lease from the first
  // sync, which ignores it.
  // A sync token of an earlier connection, maybe of another Google account, is dropped.
  public async saveConnected(userId: string, refreshToken: string): Promise<void> {
    const now = new Date();
    const values = {
      status: 'connected' as const,
      connectedAt: now,
      lastPulledAt: now.toISOString(),
      deletionsCheckedAt: '-infinity',
      contactsSyncToken: null,
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

  // Up to `limit` connected users whose last sync started before `pulledBefore` and none is running now, longest waiting
  // first. The limit spreads a backlog, such as every user right after a deploy, over several passes.
  public async findDueForSync(pulledBefore: Date, limit: number): Promise<string[]> {
    const rows = await this.db
      .select({ userId: connections.userId })
      .from(connections)
      .where(
        and(
          eq(connections.status, 'connected'),
          lte(connections.lastPulledAt, pulledBefore.toISOString()),
          lt(connections.syncRunningUntil, new Date().toISOString()),
        ),
      )
      .orderBy(asc(connections.lastPulledAt))
      .limit(limit);

    return rows.map((row) => row.userId);
  }

  // The token together with the connection it belongs to, for `saveContactsSyncToken`.
  public async readContactsSyncToken(userId: string): Promise<{ syncToken: string | null; connectedAt: Date } | null> {
    const [connection] = await this.db
      .select({ syncToken: connections.contactsSyncToken, connectedAt: connections.connectedAt })
      .from(connections)
      .where(eq(connections.userId, userId));

    return connection ?? null;
  }

  // Saved only while the connection is the one the token was read for: after a reconnect it may be another account.
  public async saveContactsSyncToken(userId: string, connectedAt: Date, syncToken: string | null): Promise<void> {
    await this.db
      .update(connections)
      .set({ contactsSyncToken: syncToken })
      .where(and(eq(connections.userId, userId), eq(connections.connectedAt, connectedAt)));
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
