import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { MODULE_OPTIONS_TOKEN } from '../auth.module-definition';
import { SIGN_IN_FLOW_MS } from '../constants';
import { AuthModuleOptions, SignInFlow } from '../types';

// Puts a sign-in flow into a cookie value and reads it back. The value is encrypted (the PKCE verifier must stay
// secret) and authenticated (it cannot be changed), and it expires after 10 minutes.
@Injectable()
export class SignInFlowSealer {
  private readonly key: Uint8Array;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) options: AuthModuleOptions) {
    // A 256-bit key for A256GCM, derived from the secret.
    this.key = createHash('sha256').update(`sign-in-flow:${options.secret}`).digest();
  }

  public seal(flow: SignInFlow): Promise<string> {
    return new EncryptJWT({ ...flow })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime(new Date(Date.now() + SIGN_IN_FLOW_MS))
      .encrypt(this.key);
  }

  // `null` for a missing, changed, expired or malformed value.
  public async open(value: string | null): Promise<SignInFlow | null> {
    if (!value) {
      return null;
    }

    try {
      const { payload } = await jwtDecrypt(value, this.key);
      const { state, nonce, codeVerifier, returnTo } = payload;

      if ([state, nonce, codeVerifier, returnTo].some((part: unknown) => typeof part !== 'string')) {
        return null;
      }

      return { state, nonce, codeVerifier, returnTo } as SignInFlow;
    } catch {
      return null;
    }
  }
}
