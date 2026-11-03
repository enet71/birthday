import { requireEnv } from './env.ts';

// `calendar.events.owned` writes birthday events into the user's primary calendar; `contacts.readonly` reads the
// birthdays of the user's Google contacts.
export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events.owned', 'https://www.googleapis.com/auth/contacts.readonly'];

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

// Google returns the user to `redirectUri`, an app page that must be listed in the OAuth client.
export function buildGoogleConsentUrl(redirectUri: string, state: string, loginHint: string | undefined): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');

  url.search = new URLSearchParams({
    client_id: requireEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES.join(' '),
    // `offline` with `consent` makes Google return a refresh token every time, also when reconnecting.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
    ...(loginHint ? { login_hint: loginHint } : {}),
  }).toString();

  return url.toString();
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  return await requestGoogleToken({
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
}

// The user can untick scopes on the consent page, so check what Google actually granted.
export function hasGoogleCalendarScopes(grantedScope: string): boolean {
  const granted = new Set(grantedScope.split(' '));

  return GOOGLE_CALENDAR_SCOPES.every((scope) => granted.has(scope));
}

// Google answers 400 for a token that is already revoked or expired, which ends the access just the same.
export async function revokeGoogleToken(token: string): Promise<void> {
  const response = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  });

  if (!response.ok && response.status !== 400) {
    throw new Error(`Google token revocation failed: ${response.status} ${await response.text()}`);
  }
}

async function requestGoogleToken(params: Record<string, string>): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      ...params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token request failed: ${response.status} ${await response.text()}`);
  }

  return await response.json();
}
