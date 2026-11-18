import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { MODULE_OPTIONS_TOKEN } from '../auth.module-definition';
import { SIGN_IN_NONCE_MS } from '../constants';
import { AuthModuleOptions } from '../types';

// Puts a sign-in nonce into a cookie value and reads it back. The value is encrypted and authenticated, so it cannot be
// read or changed, and it expires after 10 minutes.
@Injectable()
export class SignInNonceSealer {
  private readonly key: Uint8Array;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) options: AuthModuleOptions) {
    // A 256-bit key for A256GCM, derived from the secret.
    this.key = createHash('sha256').update(`sign-in-nonce:${options.secret}`).digest();
  }

  public createNonce(): string {
    return randomBytes(32).toString('base64url');
  }

  public seal(nonce: string): Promise<string> {
    return new EncryptJWT({ nonce })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime(new Date(Date.now() + SIGN_IN_NONCE_MS))
      .encrypt(this.key);
  }

  // `null` for a missing, changed, expired or malformed value.
  public async open(value: string | null): Promise<string | null> {
    if (!value) {
      return null;
    }

    try {
      const { payload } = await jwtDecrypt(value, this.key);

      return typeof payload['nonce'] === 'string' ? payload['nonce'] : null;
    } catch {
      return null;
    }
  }
}
