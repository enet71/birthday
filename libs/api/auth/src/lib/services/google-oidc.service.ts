import { Inject, Injectable } from '@nestjs/common';
import * as oidc from 'openid-client';
import { MODULE_OPTIONS_TOKEN } from '../auth.module-definition';
import { GOOGLE_CALLBACK_PATH, GOOGLE_ISSUER, GOOGLE_SCOPES } from '../constants';
import { AuthModuleOptions, GoogleProfile, SignInFlow } from '../types';

// Signs users in with Google (OpenID Connect, authorization code flow with PKCE). openid-client checks the state, the
// nonce, the PKCE verifier and the ID token's signature, issuer, audience and expiry.
@Injectable()
export class GoogleOidcService {
  private configuration: Promise<oidc.Configuration> | null = null;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: AuthModuleOptions) {}

  public createFlow(returnTo: string): SignInFlow {
    return { state: oidc.randomState(), nonce: oidc.randomNonce(), codeVerifier: oidc.randomPKCECodeVerifier(), returnTo };
  }

  public async createAuthorizationUrl(flow: SignInFlow): Promise<URL> {
    return oidc.buildAuthorizationUrl(await this.getConfiguration(), {
      redirect_uri: this.redirectUri,
      scope: GOOGLE_SCOPES,
      code_challenge: await oidc.calculatePKCECodeChallenge(flow.codeVerifier),
      code_challenge_method: 'S256',
      state: flow.state,
      nonce: flow.nonce,
      // Lets someone with several Google accounts pick the right one.
      prompt: 'select_account',
    });
  }

  // `callbackUrl` is the full URL Google returned the browser to.
  public async completeSignIn(callbackUrl: URL, flow: SignInFlow): Promise<GoogleProfile> {
    const tokens = await oidc.authorizationCodeGrant(await this.getConfiguration(), callbackUrl, {
      pkceCodeVerifier: flow.codeVerifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims();

    // An unverified email could belong to someone else, so it is not trusted.
    if (!claims?.sub || typeof claims['email'] !== 'string' || claims['email_verified'] !== true) {
      throw new Error('The Google ID token has no verified email');
    }

    return { sub: claims.sub, email: claims['email'], name: typeof claims['name'] === 'string' ? claims['name'] : null };
  }

  private get redirectUri(): string {
    return `${this.options.appOrigin}${GOOGLE_CALLBACK_PATH}`;
  }

  // Google's endpoints and keys are discovered once; a failed discovery is tried again on the next sign-in.
  private getConfiguration(): Promise<oidc.Configuration> {
    this.configuration ??= oidc
      .discovery(new URL(GOOGLE_ISSUER), this.options.googleClientId, this.options.googleClientSecret)
      .catch((error: unknown) => {
        this.configuration = null;
        throw error;
      });

    return this.configuration;
  }
}
