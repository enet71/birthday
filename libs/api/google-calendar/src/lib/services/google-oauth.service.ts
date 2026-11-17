import { Inject, Injectable } from '@nestjs/common';
import { GOOGLE_CALENDAR_SCOPES } from '../constants';
import { MODULE_OPTIONS_TOKEN } from '../google-calendar.module-definition';
import { GoogleCalendarModuleOptions, GoogleTokens } from '../types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REQUEST_TIMEOUT_MS = 30 * 1000;

interface GoogleTokenResponse {
  access_token: string;
  scope?: string;
  refresh_token?: string;
}

// Google's OAuth endpoints for the calendar access. Signing in to Birthdly is a separate flow (`api-auth`).
@Injectable()
export class GoogleOAuthService {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: GoogleCalendarModuleOptions) {}

  // Google returns the user to `redirectUri`, an app page that must be listed in the OAuth client.
  public buildConsentUrl(redirectUri: string, state: string, loginHint: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    url.search = new URLSearchParams({
      client_id: this.options.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GOOGLE_CALENDAR_SCOPES.join(' '),
      // `offline` with `consent` makes Google return a refresh token every time, also when reconnecting.
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
      login_hint: loginHint,
    }).toString();

    return url.toString();
  }

  public async exchangeCode(code: string, redirectUri: string): Promise<GoogleTokens> {
    const response = await this.requestToken({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' });

    if (!response.ok) {
      throw new Error(`Google code exchange failed: ${response.status} ${await response.text()}`);
    }
    return this.toTokens(await response.json());
  }

  // `null` when Google no longer accepts the refresh token: the user revoked the access, or it expired.
  public async refreshAccessToken(refreshToken: string): Promise<GoogleTokens | null> {
    const response = await this.requestToken({ refresh_token: refreshToken, grant_type: 'refresh_token' });

    if (response.ok) {
      return this.toTokens(await response.json());
    }

    const body = await response.text();

    if (response.status === 400 && body.includes('invalid_grant')) {
      return null;
    }
    throw new Error(`Google token refresh failed: ${response.status} ${body}`);
  }

  // The user can untick scopes on the consent page, so check what Google actually granted.
  public hasRequiredScopes(grantedScope: string): boolean {
    const granted = new Set(grantedScope.split(' '));

    return GOOGLE_CALENDAR_SCOPES.every((scope) => granted.has(scope));
  }

  // Google answers 400 for a token that is already revoked or expired, which ends the access just the same.
  public async revoke(token: string): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok && response.status !== 400) {
      throw new Error(`Google token revocation failed: ${response.status} ${await response.text()}`);
    }
  }

  private requestToken(params: Record<string, string>): Promise<Response> {
    return fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: this.options.googleClientId, client_secret: this.options.googleClientSecret, ...params }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  private toTokens(response: GoogleTokenResponse): GoogleTokens {
    return { accessToken: response.access_token, scope: response.scope ?? '', refreshToken: response.refresh_token ?? null };
  }
}
