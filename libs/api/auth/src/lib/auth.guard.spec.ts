import { ExecutionContext, HttpStatus, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { base64url, createLocalJWKSet, exportJWK, generateKeyPair, JWTPayload, JWTVerifyGetKey, SignJWT } from 'jose';
import { AuthGuard } from './auth.guard';
import { MODULE_OPTIONS_TOKEN } from './auth.module-definition';
import { JWT_KEY_SET } from './constants';
import { Public } from './decorators';
import { KeySetUnavailableError } from './supabase-key-set';
import { AuthUser } from './types';

type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

interface SignOptions {
  key?: PrivateKey | Uint8Array;
  kid?: string;
  alg?: string;
  issuer?: string;
  audience?: string;
  expiresAt?: number | string;
}

interface FakeRequest {
  headers: { authorization?: string };
  user?: AuthUser;
}

class PrivateController {
  public handle(): void {
    return undefined;
  }
}

class PublicHandlerController {
  @Public()
  public handle(): void {
    return undefined;
  }
}

@Public()
class PublicController {
  public handle(): void {
    return undefined;
  }
}

const SUPABASE_URL = 'https://project.supabase.co';
const ISSUER = 'https://project.supabase.co/auth/v1';
const KID = 'key-1';
const USER_ID = '6f1c1a8e-0000-4000-8000-000000000001';
const EMAIL = 'user@example.com';
const VALID_CLAIMS: JWTPayload = { sub: USER_ID, email: EMAIL, role: 'authenticated' };

describe('AuthGuard', () => {
  let privateKey: PrivateKey;
  let otherPrivateKey: PrivateKey;
  let localKeySet: JWTVerifyGetKey;
  let keySet: JWTVerifyGetKey;
  let guard: AuthGuard;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('ES256', { extractable: true });
    const publicJwk = await exportJWK(keyPair.publicKey);

    privateKey = keyPair.privateKey;
    otherPrivateKey = (await generateKeyPair('ES256')).privateKey;
    localKeySet = createLocalJWKSet({ keys: [{ ...publicJwk, kid: KID, alg: 'ES256' }] });
  });

  beforeEach(async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    keySet = localKeySet;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthGuard,
        Reflector,
        { provide: JWT_KEY_SET, useValue: (...args: Parameters<JWTVerifyGetKey>) => keySet(...args) },
        { provide: MODULE_OPTIONS_TOKEN, useValue: { supabaseUrl: SUPABASE_URL } },
      ],
    }).compile();

    guard = moduleRef.get(AuthGuard);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function signToken(claims: JWTPayload = VALID_CLAIMS, options: SignOptions = {}): Promise<string> {
    const { key = privateKey, kid = KID, alg = 'ES256', issuer = ISSUER, audience = 'authenticated', expiresAt = '1h' } = options;

    return new SignJWT(claims)
      .setProtectedHeader({ alg, kid, typ: 'JWT' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(key);
  }

  function createContext(request: FakeRequest, controller: new () => { handle(): void } = PrivateController): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => controller.prototype.handle,
      getClass: () => controller,
    } as unknown as ExecutionContext;
  }

  function bearer(token: string): FakeRequest {
    return { headers: { authorization: `Bearer ${token}` } };
  }

  async function activate(request: FakeRequest, controller?: new () => { handle(): void }): Promise<unknown> {
    return guard.canActivate(createContext(request, controller)).catch((error: unknown) => error);
  }

  describe('with a valid token', () => {
    it('allows the request and sets the user from the token', async () => {
      const request = bearer(await signToken());

      await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
      expect(request.user).toEqual({ id: USER_ID, email: EMAIL });
    });

    it('sets a null email when the token has none', async () => {
      const request = bearer(await signToken({ sub: USER_ID, role: 'authenticated' }));

      await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
      expect(request.user).toEqual({ id: USER_ID, email: null });
    });
  });

  describe('without a bearer token', () => {
    it.each([
      ['no Authorization header', undefined],
      ['a non-Bearer scheme', 'Basic dXNlcjpwYXNz'],
      ['a Bearer value with two parts', 'Bearer abc def'],
    ])('rejects a request with %s', async (_case: string, authorization: string | undefined) => {
      const request: FakeRequest = { headers: { authorization } };

      await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
      expect(request.user).toBeUndefined();
    });
  });

  describe('with an invalid token', () => {
    it.each<[string, () => Promise<string>]>([
      ['an expired token', () => signToken(VALID_CLAIMS, { expiresAt: Math.floor(Date.now() / 1000) - 60 })],
      ['another issuer', () => signToken(VALID_CLAIMS, { issuer: 'https://other.supabase.co/auth/v1' })],
      ['another audience', () => signToken(VALID_CLAIMS, { audience: 'anon' })],
      ['the anon role', () => signToken({ sub: USER_ID, role: 'anon' })],
      ['the service_role role', () => signToken({ sub: USER_ID, role: 'service_role' })],
      ['no role', () => signToken({ sub: USER_ID, email: EMAIL })],
      ['no sub', () => signToken({ email: EMAIL, role: 'authenticated' })],
      ['a signature by another key with the same kid', () => signToken(VALID_CLAIMS, { key: otherPrivateKey })],
      ['an unknown kid', () => signToken(VALID_CLAIMS, { kid: 'unknown-key' })],
      ['an HS256 signature', () => signToken(VALID_CLAIMS, { key: new TextEncoder().encode('a-shared-secret-of-32-bytes-long'), alg: 'HS256' })],
      ['a tampered payload', () => tamperPayload(signToken())],
      ['a malformed value', () => Promise.resolve('not-a-jwt')],
    ])('rejects %s with 401', async (_case: string, createToken: () => Promise<string>) => {
      const request = bearer(await createToken());

      await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
      expect(request.user).toBeUndefined();
    });

    it('does not reveal the reason in the 401 response', async () => {
      const error = await activate(bearer(await signToken(VALID_CLAIMS, { issuer: 'https://other.supabase.co/auth/v1' })));

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toEqual({ statusCode: HttpStatus.UNAUTHORIZED, message: 'Unauthorized' });
    });
  });

  describe('on a public endpoint', () => {
    it.each([
      ['handler', PublicHandlerController],
      ['controller', PublicController],
    ])('allows a request without a token when the %s is @Public()', async (_case: string, controller: new () => { handle(): void }) => {
      const request: FakeRequest = { headers: {} };

      await expect(guard.canActivate(createContext(request, controller))).resolves.toBe(true);
      expect(request.user).toBeUndefined();
    });
  });

  describe('when the signing keys cannot be loaded', () => {
    it.each([
      ['KeySetUnavailableError', new KeySetUnavailableError('Loading the Supabase signing keys failed')],
      ['an unexpected error', new TypeError('Unexpected failure')],
    ])('answers 503 for %s and logs it', async (_case: string, keySetError: Error) => {
      keySet = () => Promise.reject(keySetError);

      const error = await activate(bearer(await signToken()));

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(Logger.prototype.error).toHaveBeenCalledWith({ err: keySetError }, 'Loading the Supabase signing keys failed');
    });
  });
});

async function tamperPayload(token: Promise<string>): Promise<string> {
  const [header, payload, signature] = (await token).split('.');
  const claims: JWTPayload = JSON.parse(new TextDecoder().decode(base64url.decode(payload)));
  const tampered = base64url.encode(JSON.stringify({ ...claims, sub: 'another-user' }));

  return `${header}.${tampered}.${signature}`;
}
