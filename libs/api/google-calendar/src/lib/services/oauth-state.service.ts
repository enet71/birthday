import { Inject, Injectable } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { MODULE_OPTIONS_TOKEN } from '../google-calendar.module-definition';
import { GoogleCalendarModuleOptions, OAuthState } from '../types';

const STATE_LIFETIME_MS = 10 * 60 * 1000;

// The connect request travels through Google's consent page as a signed state, so nobody can change it. Completing
// requires the same user and the nonce that only the starting browser tab keeps.
@Injectable()
export class OAuthStateService {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: GoogleCalendarModuleOptions) {}

  public create(userId: string, redirectUri: string, nonce: string): string {
    const state: OAuthState = { userId, redirectUri, nonceHash: this.hashNonce(nonce), expiresAt: Date.now() + STATE_LIFETIME_MS };
    const body = Buffer.from(JSON.stringify(state)).toString('base64url');

    return `${body}.${this.sign(body).toString('base64url')}`;
  }

  // `null` for a forged or expired state.
  public read(value: string): OAuthState | null {
    const [body, signature] = value.split('.');

    if (!body || !signature) {
      return null;
    }

    const expected = this.sign(body);
    const actual = Buffer.from(signature, 'base64url');

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return null;
    }

    try {
      const state: OAuthState = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));

      return state.expiresAt > Date.now() ? state : null;
    } catch {
      return null;
    }
  }

  public hashNonce(nonce: string): string {
    return createHash('sha256').update(nonce).digest('base64url');
  }

  private sign(body: string): Buffer {
    return createHmac('sha256', this.options.oauthStateSecret).update(body).digest();
  }
}
