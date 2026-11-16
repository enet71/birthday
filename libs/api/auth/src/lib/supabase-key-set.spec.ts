import type { Mock } from 'vitest';
import { Logger } from '@nestjs/common';
import { errors, exportJWK, generateKeyPair, JWK, jwtVerify, SignJWT } from 'jose';
import { createSupabaseKeySet, KeySetUnavailableError } from './supabase-key-set';

type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

interface SigningKey {
  privateKey: PrivateKey;
  jwk: JWK;
}

const JWKS_URL = new URL('https://project.supabase.co/auth/v1/.well-known/jwks.json');
const START = new Date('2026-01-01T00:00:00Z');
const SECOND = 1000;
const MINUTE = 60 * SECOND;

describe('createSupabaseKeySet', () => {
  let currentKey: SigningKey;
  let rotatedKey: SigningKey;
  let fetchMock: Mock<typeof fetch>;

  beforeAll(async () => {
    currentKey = await createSigningKey('key-current');
    rotatedKey = await createSigningKey('key-rotated');
  });

  beforeEach(() => {
    // jose ages its key cache with Date.now(); only Date is faked so fetch and AbortSignal keep working.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(START);
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function respondWithKeys(...keys: SigningKey[]): void {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({ keys: keys.map(({ jwk }: SigningKey) => jwk) })));
  }

  function respondWith(body: string, status: number): void {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(body, { status })));
  }

  function advanceTime(ms: number): void {
    vi.setSystemTime(Date.now() + ms);
  }

  function signToken(key: SigningKey): Promise<string> {
    return new SignJWT({ sub: 'user-1' })
      .setProtectedHeader({ alg: 'ES256', kid: key.jwk.kid })
      .setIssuedAt()
      .setExpirationTime('2h')
      .sign(key.privateKey);
  }

  async function verifyWith(keySet: ReturnType<typeof createSupabaseKeySet>, key: SigningKey): Promise<unknown> {
    const { payload } = await jwtVerify(await signToken(key), keySet);

    return payload.sub;
  }

  async function verifyError(keySet: ReturnType<typeof createSupabaseKeySet>, key: SigningKey): Promise<unknown> {
    return verifyWith(keySet, key).catch((error: unknown) => error);
  }

  describe('before any keys are loaded', () => {
    it('resolves the key of a token from the JWKS', async () => {
      respondWithKeys(currentKey);
      const keySet = createSupabaseKeySet(JWKS_URL);

      await expect(verifyWith(keySet, currentKey)).resolves.toBe('user-1');
      expect(fetchMock).toHaveBeenCalledWith(JWKS_URL.href, expect.objectContaining({ method: 'GET' }));
    });

    it.each([500, 404])('throws KeySetUnavailableError when the JWKS answers %i', async (status: number) => {
      respondWith('{"error":"unavailable"}', status);
      const keySet = createSupabaseKeySet(JWKS_URL);

      await expect(verifyWith(keySet, currentKey)).rejects.toThrow(KeySetUnavailableError);
    });

    it('throws KeySetUnavailableError when the JWKS body is not JSON', async () => {
      respondWith('<html>Bad gateway</html>', 200);
      const keySet = createSupabaseKeySet(JWKS_URL);

      await expect(verifyWith(keySet, currentKey)).rejects.toThrow(KeySetUnavailableError);
    });

    it('throws KeySetUnavailableError when the request fails', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const keySet = createSupabaseKeySet(JWKS_URL);

      await expect(verifyWith(keySet, currentKey)).rejects.toThrow(KeySetUnavailableError);
    });
  });

  describe('after the keys are loaded', () => {
    let keySet: ReturnType<typeof createSupabaseKeySet>;

    beforeEach(async () => {
      respondWithKeys(currentKey);
      keySet = createSupabaseKeySet(JWKS_URL);
      await verifyWith(keySet, currentKey);
      fetchMock.mockClear();
    });

    it('keeps verifying with the last keys when the cache is older than 10 minutes and the refresh fails', async () => {
      respondWith('', 500);
      advanceTime(10 * MINUTE + SECOND);

      await expect(verifyWith(keySet, currentKey)).resolves.toBe('user-1');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        { err: expect.any(errors.JOSEError) },
        'Refreshing the Supabase signing keys failed; using the keys loaded last',
      );
    });

    it('throws KeySetUnavailableError for an unknown key when the refresh fails', async () => {
      respondWith('', 500);
      advanceTime(30 * SECOND + SECOND);

      await expect(verifyWith(keySet, rotatedKey)).rejects.toThrow(KeySetUnavailableError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws JWKSNoMatchingKey for an unknown key that the refreshed keys do not have', async () => {
      advanceTime(30 * SECOND + SECOND);

      const error = await verifyError(keySet, rotatedKey);

      expect(error).toBeInstanceOf(errors.JWKSNoMatchingKey);
      expect(error).not.toBeInstanceOf(KeySetUnavailableError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('verifies a token signed with a rotated key after refreshing the keys', async () => {
      respondWithKeys(currentKey, rotatedKey);
      advanceTime(30 * SECOND + SECOND);

      await expect(verifyWith(keySet, rotatedKey)).resolves.toBe('user-1');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

async function createSigningKey(kid: string): Promise<SigningKey> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });

  return { privateKey, jwk: { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' } };
}
