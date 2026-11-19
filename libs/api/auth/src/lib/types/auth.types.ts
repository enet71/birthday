import type { Request } from 'express';
import type { UserDto } from '@birthday/shared-models';

// The signed-in user of a request.
export type AuthUser = UserDto;

export interface AuthModuleOptions {
  googleClientId: string;
  googleClientSecret: string;
  // The web app's origin, for example `https://birthdly.com`; the API is served under it at `/api`.
  appOrigin: string;
  // Encrypts the sign-in nonce cookie; at least 32 characters.
  secret: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

// What the API takes from Google's ID token.
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
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
