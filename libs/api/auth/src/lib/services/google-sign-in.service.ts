import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, errors, JWTPayload, jwtVerify } from 'jose';
import { MODULE_OPTIONS_TOKEN } from '../auth.module-definition';
import { GOOGLE_ISSUERS, GOOGLE_JWKS_URL, GOOGLE_POPUP_REDIRECT_URI, GOOGLE_TOKEN_URL } from '../constants';
import { GoogleSignInRejectedError } from '../errors';
import { AuthModuleOptions, GoogleProfile } from '../types';

const REQUEST_TIMEOUT_MS = 30 * 1000;

// Signs users in with Google Identity Services. The web app gets either an authorization code (the sign-in popup) or an
// ID token (One Tap); both end in an ID token whose signature, issuer, audience and expiry are checked here.
@Injectable()
export class GoogleSignInService {
  // jose caches Google's keys and fetches them again when a token is signed with an unknown key.
  private readonly keys: ReturnType<typeof createRemoteJWKSet> = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: AuthModuleOptions) {}

  public get clientId(): string {
    return this.options.googleClientId;
  }

  public async signInWithCode(code: string): Promise<GoogleProfile> {
    return this.verifyIdToken(await this.exchangeCode(code), null);
  }

  // `nonce` is the one this browser got from the API; a One Tap token without it was issued elsewhere.
  public signInWithCredential(credential: string, nonce: string): Promise<GoogleProfile> {
    return this.verifyIdToken(credential, nonce);
  }

  private async exchangeCode(code: string): Promise<string> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.options.googleClientId,
        client_secret: this.options.googleClientSecret,
        redirect_uri: GOOGLE_POPUP_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // 400 is an invalid, used or expired code; any other failure is on Google's side.
    if (response.status === 400) {
      throw new GoogleSignInRejectedError(`Google rejected the code: ${await response.text()}`);
    }
    if (!response.ok) {
      throw new Error(`Google code exchange failed: ${response.status} ${await response.text()}`);
    }

    const { id_token: idToken } = (await response.json()) as { id_token?: unknown };

    if (typeof idToken !== 'string') {
      throw new Error('Google returned no ID token');
    }
    return idToken;
  }

  private async verifyIdToken(idToken: string, nonce: string | null): Promise<GoogleProfile> {
    const claims = await this.verifySignature(idToken);

    if (nonce !== null && claims['nonce'] !== nonce) {
      throw new GoogleSignInRejectedError('The Google ID token has another nonce');
    }
    // An unverified email could belong to someone else, so it is not trusted.
    if (!claims.sub || typeof claims['email'] !== 'string' || claims['email_verified'] !== true) {
      throw new GoogleSignInRejectedError('The Google ID token has no verified email');
    }

    return { sub: claims.sub, email: claims['email'], name: typeof claims['name'] === 'string' ? claims['name'] : null };
  }

  private async verifySignature(idToken: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(idToken, this.keys, { issuer: GOOGLE_ISSUERS, audience: this.options.googleClientId });

      return payload;
    } catch (error) {
      // Failing to load Google's keys is not the token's fault: jose reports it as a timeout, an invalid key set or a plain
      // `JOSEError` (a non-200 answer or a body that is not JSON).
      if (
        error instanceof errors.JOSEError &&
        error.constructor !== errors.JOSEError &&
        !(error instanceof errors.JWKSTimeout) &&
        !(error instanceof errors.JWKSInvalid)
      ) {
        throw new GoogleSignInRejectedError(`The Google ID token is invalid: ${error.code}`);
      }
      throw error;
    }
  }
}
