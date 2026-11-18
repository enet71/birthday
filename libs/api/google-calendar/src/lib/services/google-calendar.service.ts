import { ConflictException, Injectable, Logger } from '@nestjs/common';
import {
  GoogleCalendarCompleteRequest,
  GoogleCalendarCompleteResponse,
  GoogleCalendarConnectionDto,
  GoogleCalendarSyncResponse,
} from '@birthday/shared-models';
import { AUTOMATIC_SYNC_INTERVAL_MS } from '../constants';
import { GoogleAccessRevokedError } from '../errors';
import { GoogleCalendarEventsService } from './google-calendar-events.service';
import { GoogleCalendarJobsService } from './google-calendar-jobs.service';
import { GoogleConnectionsService } from './google-connections.service';
import { GoogleImportService } from './google-import.service';
import { GoogleOAuthService } from './google-oauth.service';

// "Sync now" waits only for a sync that is running: the automatic and background syncs started recently do not read
// every contact or reconcile, so they cannot stand in for it. The button is disabled while its request runs.
const MANUAL_INTERVAL_MS = 0;
// A push that read the connection before the disconnect may still create an event; a second pass removes it.
const SECOND_PASS_DELAY_MS = 3000;

// The user's workflows behind the "Google Calendar" card.
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly connections: GoogleConnectionsService,
    private readonly oauth: GoogleOAuthService,
    private readonly events: GoogleCalendarEventsService,
    private readonly importService: GoogleImportService,
    private readonly jobs: GoogleCalendarJobsService,
  ) {}

  public getConnection(userId: string): Promise<GoogleCalendarConnectionDto | null> {
    return this.connections.find(userId);
  }

  // `code` comes from the Google popup on the user's page; `OriginGuard` keeps other sites from sending one.
  public async complete(userId: string, request: GoogleCalendarCompleteRequest): Promise<GoogleCalendarCompleteResponse> {
    const tokens = await this.oauth.exchangeCode(request.code);

    if (!this.oauth.hasRequiredScopes(tokens.scope)) {
      await this.oauth.revoke(tokens.accessToken);
      return { result: 'denied' };
    }
    // Google gives a refresh token only with a new consent, and the popup cannot ask for one. A user who is connected
    // already (a second tab, a repeated click) keeps the saved token: revoking would cut the working sync.
    if (!tokens.refreshToken) {
      if (await this.connections.isConnected(userId)) {
        return { result: 'connected' };
      }
      // Revoking the access makes the next attempt show the consent page again.
      await this.revokeQuietly(tokens.accessToken);
      throw new ConflictException('Google returned no refresh token');
    }

    await this.connections.saveConnected(userId, tokens.refreshToken);
    // Importing from Google and exporting every birthday can take a while, so it runs as a job.
    await this.jobs.enqueueFirstSync(userId);
    return { result: 'connected' };
  }

  // `manual` (the "Sync now" button) reads every contact and makes Birthdly's birthdays in Google match Birthdly again,
  // which repairs whatever failed earlier. The automatic sync shares its interval with the background one: whichever
  // ran last counts, on any device.
  public async sync(userId: string, manual: boolean): Promise<GoogleCalendarSyncResponse> {
    try {
      const summary = await this.importService.runSync(userId, {
        minIntervalMs: manual ? MANUAL_INTERVAL_MS : AUTOMATIC_SYNC_INTERVAL_MS,
        full: manual,
      });

      return summary ? { skipped: false, revoked: false, ...summary } : { skipped: true, revoked: false, added: 0, updated: 0, deleted: 0 };
    } catch (error) {
      if (error instanceof GoogleAccessRevokedError) {
        return { skipped: true, revoked: true, added: 0, updated: 0, deleted: 0 };
      }
      throw error;
    }
  }

  // Stops the sync and removes the birthdays Birthdly created in Google; the birthdays stay in Birthdly. The access is
  // revoked even when removing them fails, so a disconnect never leaves a usable token behind.
  public async disconnect(userId: string): Promise<void> {
    // First, so queued pushes stop while the birthdays are being removed.
    await this.connections.markDisconnected(userId);

    const refreshToken = await this.connections.readRefreshToken(userId);

    if (refreshToken) {
      await this.removeBirthdayEvents(userId);
      await this.oauth.revoke(refreshToken);
    }
    await this.connections.forgetRefreshToken(userId);
  }

  // A failed revocation must not hide the real answer; the log tells why the next attempt fails again.
  private async revokeQuietly(accessToken: string): Promise<void> {
    try {
      await this.oauth.revoke(accessToken);
    } catch (error) {
      this.logger.error({ err: error }, 'Revoking a Google Calendar access without a refresh token failed');
    }
  }

  private async removeBirthdayEvents(userId: string): Promise<void> {
    try {
      const accessToken = await this.connections.getAccessToken(userId);

      await this.events.forgetAndDeleteBirthdayEvents(userId, accessToken);
      await new Promise((resolve) => setTimeout(resolve, SECOND_PASS_DELAY_MS));
      await this.events.forgetAndDeleteBirthdayEvents(userId, accessToken);
    } catch (error) {
      // Google no longer accepts the access, or removing failed: the birthdays stay in Google, where the user can delete
      // them, and the next connection's reconcile removes them, because no birthday points to them any more.
      if (!(error instanceof GoogleAccessRevokedError)) {
        this.logger.error({ err: error }, 'Removing the birthdays from Google Calendar failed');
      }
    }
  }
}
