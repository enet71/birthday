import type { Mock } from 'vitest';
import * as oidc from 'openid-client';
import { AuthModuleOptions, SignInFlow } from '../types';
import { GoogleOidcService } from './google-oidc.service';

vi.mock('openid-client', () => ({
  discovery: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
  authorizationCodeGrant: vi.fn(),
  randomState: vi.fn(),
  randomNonce: vi.fn(),
  randomPKCECodeVerifier: vi.fn(),
}));

const OPTIONS: AuthModuleOptions = {
  googleClientId: 'client-id',
  googleClientSecret: 'client-secret',
  appOrigin: 'https://birthdly.example',
  secret: 'secret',
};
const FLOW: SignInFlow = { state: 'state-1', nonce: 'nonce-1', codeVerifier: 'verifier-1', returnTo: '/people' };
const CONFIGURATION = { issuer: 'google' } as unknown as oidc.Configuration;
const AUTHORIZATION_URL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
const CALLBACK_URL = new URL('https://birthdly.example/api/auth/google/callback?code=code-1&state=state-1');

const discovery = oidc.discovery as Mock<typeof oidc.discovery>;
const buildAuthorizationUrl = oidc.buildAuthorizationUrl as Mock<typeof oidc.buildAuthorizationUrl>;
const calculatePKCECodeChallenge = oidc.calculatePKCECodeChallenge as Mock<typeof oidc.calculatePKCECodeChallenge>;
const authorizationCodeGrant = oidc.authorizationCodeGrant as Mock<typeof oidc.authorizationCodeGrant>;

function grantWithClaims(claims: Record<string, unknown> | undefined): void {
  authorizationCodeGrant.mockResolvedValue({ claims: () => claims } as unknown as Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>);
}

describe('GoogleOidcService', () => {
  let service: GoogleOidcService;

  beforeEach(() => {
    vi.clearAllMocks();
    discovery.mockResolvedValue(CONFIGURATION);
    buildAuthorizationUrl.mockReturnValue(AUTHORIZATION_URL);
    calculatePKCECodeChallenge.mockResolvedValue('challenge-1');
    service = new GoogleOidcService(OPTIONS);
  });

  describe('createFlow', () => {
    it('creates a random state, nonce and PKCE verifier for the return path', () => {
      (oidc.randomState as Mock<typeof oidc.randomState>).mockReturnValue('state-1');
      (oidc.randomNonce as Mock<typeof oidc.randomNonce>).mockReturnValue('nonce-1');
      (oidc.randomPKCECodeVerifier as Mock<typeof oidc.randomPKCECodeVerifier>).mockReturnValue('verifier-1');

      expect(service.createFlow('/people')).toEqual(FLOW);
    });
  });

  describe('createAuthorizationUrl', () => {
    it('asks Google for an authorization code with PKCE, state and nonce', async () => {
      expect(await service.createAuthorizationUrl(FLOW)).toBe(AUTHORIZATION_URL);

      expect(discovery).toHaveBeenCalledWith(new URL('https://accounts.google.com'), 'client-id', 'client-secret');
      expect(calculatePKCECodeChallenge).toHaveBeenCalledWith('verifier-1');
      expect(buildAuthorizationUrl).toHaveBeenCalledWith(CONFIGURATION, {
        redirect_uri: 'https://birthdly.example/api/auth/google/callback',
        scope: 'openid email profile',
        code_challenge: 'challenge-1',
        code_challenge_method: 'S256',
        state: 'state-1',
        nonce: 'nonce-1',
        prompt: 'select_account',
      });
    });

    it('discovers Google only once', async () => {
      await service.createAuthorizationUrl(FLOW);
      await service.createAuthorizationUrl(FLOW);

      expect(discovery).toHaveBeenCalledTimes(1);
    });

    it('discovers Google again after a failed discovery', async () => {
      discovery.mockRejectedValueOnce(new Error('network'));

      await expect(service.createAuthorizationUrl(FLOW)).rejects.toThrow('network');
      expect(await service.createAuthorizationUrl(FLOW)).toBe(AUTHORIZATION_URL);
      expect(discovery).toHaveBeenCalledTimes(2);
    });
  });

  describe('completeSignIn', () => {
    it('checks the callback against the flow and returns the profile', async () => {
      grantWithClaims({ sub: 'google-1', email: 'user@example.com', email_verified: true, name: 'User' });

      expect(await service.completeSignIn(CALLBACK_URL, FLOW)).toEqual({ sub: 'google-1', email: 'user@example.com', name: 'User' });
      expect(authorizationCodeGrant).toHaveBeenCalledWith(CONFIGURATION, CALLBACK_URL, {
        pkceCodeVerifier: 'verifier-1',
        expectedState: 'state-1',
        expectedNonce: 'nonce-1',
        idTokenExpected: true,
      });
    });

    it('returns a null name when the token has none', async () => {
      grantWithClaims({ sub: 'google-1', email: 'user@example.com', email_verified: true });

      expect(await service.completeSignIn(CALLBACK_URL, FLOW)).toEqual({ sub: 'google-1', email: 'user@example.com', name: null });
    });

    it.each([
      ['the email is not verified', { sub: 'google-1', email: 'user@example.com', email_verified: false }],
      ['the email verification is a string', { sub: 'google-1', email: 'user@example.com', email_verified: 'true' }],
      ['the email verification is missing', { sub: 'google-1', email: 'user@example.com' }],
      ['the email is missing', { sub: 'google-1', email_verified: true }],
      ['the subject is missing', { email: 'user@example.com', email_verified: true }],
      ['there are no claims', undefined],
    ])('rejects the sign-in when %s', async (_case: string, claims: Record<string, unknown> | undefined) => {
      grantWithClaims(claims);

      await expect(service.completeSignIn(CALLBACK_URL, FLOW)).rejects.toThrow('The Google ID token has no verified email');
    });

    it('rejects the sign-in when openid-client rejects the callback', async () => {
      authorizationCodeGrant.mockRejectedValue(new Error('state mismatch'));

      await expect(service.completeSignIn(CALLBACK_URL, FLOW)).rejects.toThrow('state mismatch');
    });
  });
});
