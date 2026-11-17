import { BadRequestException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  GoogleCalendarCompleteRequest,
  GoogleCalendarCompleteResponse,
  GoogleCalendarConnectionDto,
  GoogleCalendarConnectRequest,
  GoogleCalendarConnectResponse,
  GoogleCalendarSyncResponse,
} from '@birthday/shared-models';
import { AuthUser } from '@birthday/api-auth';
import { GoogleAccessRevokedError } from '../errors';
import { MODULE_OPTIONS_TOKEN } from '../google-calendar.module-definition';
import { GoogleCalendarModuleOptions } from '../types';
import { GoogleCalendarEventsService } from './google-calendar-events.service';
import { GoogleCalendarJobsService } from './google-calendar-jobs.service';
import { GoogleConnectionsService } from './google-connections.service';
import { GoogleImportService } from './google-import.service';
import { GoogleOAuthService } from './google-oauth.service';
import { OAuthStateService } from './oauth-state.service';

// An automatic import runs at most once an hour across all of the user's devices; "Sync now" only skips a repeated
// click.
const AUTOMATIC_INTERVAL_MS = 60 * 60 * 1000;
const MANUAL_INTERVAL_MS = 30 * 1000;
// A push that read the connection before the disconnect may still create an event; a second pass removes it.
const SECOND_PASS_DELAY_MS = 3000;

// The user's workflows behind the "Google Calendar" card.
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: GoogleCalendarModuleOptions,
    private readonly connections: GoogleConnectionsService,
    private readonly oauth: GoogleOAuthService,
    private readonly oauthState: OAuthStateService,
    private readonly events: GoogleCalendarEventsService,
    private readonly importService: GoogleImportService,
    private readonly jobs: GoogleCalendarJobsService,
  ) {}

  public getConnection(userId: string): Promise<GoogleCalendarConnectionDto | null> {
    return this.connections.find(userId);
  }

  // Google returns the browser to `redirectUri` in the app, which then calls `complete`.
  public connect(user: AuthUser, request: GoogleCalendarConnectRequest): GoogleCalendarConnectResponse {
    if (new URL(request.redirectUri).origin !== this.options.appOrigin) {
      throw new BadRequestException('The redirect URI is not allowed');
    }

    const state = this.oauthState.create(user.id, request.redirectUri, request.nonce);

    return { url: this.oauth.buildConsentUrl(request.redirectUri, state, user.email) };
  }

  // Requires the session of the user who started connecting and the nonce of their browser tab, so a consent link sent
  // to someone else cannot attach their Google account.
  public async complete(userId: string, request: GoogleCalendarCompleteRequest): Promise<GoogleCalendarCompleteResponse> {
    const state = this.oauthState.read(request.state);

    if (!state) {
      throw new BadRequestException('The connect request is invalid or expired');
    }
    if (state.userId !== userId || state.nonceHash !== this.oauthState.hashNonce(request.nonce)) {
      throw new ForbiddenException('The connect request was started elsewhere');
    }

    const tokens = await this.oauth.exchangeCode(request.code, state.redirectUri);

    if (!this.oauth.hasRequiredScopes(tokens.scope)) {
      await this.oauth.revoke(tokens.accessToken);
      return { result: 'denied' };
    }
    if (!tokens.refreshToken) {
      throw new Error('Google returned no refresh token');
    }

    await this.connections.saveConnected(userId, tokens.refreshToken);
    // Importing from Google and exporting every birthday can take a while, so it runs as a job.
    await this.jobs.enqueueFirstSync(userId);
    return { result: 'connected' };
  }

  // `manual` (the "Sync now" button) also makes Birthdly's birthdays in Google match Birthdly again, which repairs
  // exports that failed earlier.
  public async sync(userId: string, manual: boolean): Promise<GoogleCalendarSyncResponse> {
    try {
      const summary = await this.importService.runSync(userId, {
        minIntervalMs: manual ? MANUAL_INTERVAL_MS : AUTOMATIC_INTERVAL_MS,
        reconcile: manual,
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
