import type { Request } from 'express';
import type { UserDto } from '@birthday/shared-models';

// The signed-in user of a request.
export type AuthUser = UserDto;

export interface AuthModuleOptions {
  googleClientId: string;
  googleClientSecret: string;
  // The web app's origin, for example `https://birthdly.com`; the API is served under it at `/api`.
  appOrigin: string;
  // Encrypts the sign-in flow cookie; at least 32 characters.
  secret: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

// What one sign-in must remember between the redirect to Google and its callback.
export interface SignInFlow {
  state: string;
  nonce: string;
  codeVerifier: string;
  // The page to return to: a path on this site.
  returnTo: string;
}

// What the API takes from Google's ID token.
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export interface ActiveSession {
  user: AuthUser;
  expiresAt: Date;
  // The end moved forward, so the cookie must be sent again with the new expiry.
  extended: boolean;
}
