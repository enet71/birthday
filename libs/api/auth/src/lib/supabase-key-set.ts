import { Logger } from '@nestjs/common';
import { createLocalJWKSet, createRemoteJWKSet, errors, JSONWebKeySet, JWTVerifyGetKey } from 'jose';

type KeyResolverArgs = Parameters<JWTVerifyGetKey>;
type ResolvedKey = Awaited<ReturnType<JWTVerifyGetKey>>;

// The signing keys could not be loaded from Supabase; the token itself may be valid.
export class KeySetUnavailableError extends Error {}

const logger: Logger = new Logger('SupabaseKeySet');

// Resolves the key of a token from the project's JWKS. jose caches the keys for 10 minutes and fetches them again
// for a token signed with an unknown key, so a key rotation needs no restart and a revoked key stops working within
// 10 minutes. Every failure to load the keys becomes `KeySetUnavailableError`, which the guard answers with 503
// instead of 401.
export function createSupabaseKeySet(jwksUrl: URL): JWTVerifyGetKey {
  const remote = createRemoteJWKSet(jwksUrl);

  return async (...args: KeyResolverArgs): Promise<ResolvedKey> => {
    try {
      return await remote(...args);
    } catch (error) {
      // The keys were loaded, and none of them signed the token.
      if (error instanceof errors.JWKSNoMatchingKey) {
        throw error;
      }

      return await resolveFromLastKeys(remote.jwks(), args, error);
    }
  };
}

// Supabase Auth did not answer with the keys. The keys loaded last keep verifying tokens, so a short outage does not
// reject every request once the cache has expired.
async function resolveFromLastKeys(jwks: JSONWebKeySet | undefined, args: KeyResolverArgs, cause: unknown): Promise<ResolvedKey> {
  if (!jwks) {
    throw new KeySetUnavailableError('Loading the Supabase signing keys failed', { cause });
  }

  logger.warn({ err: cause }, 'Refreshing the Supabase signing keys failed; using the keys loaded last');

  try {
    return await createLocalJWKSet(jwks)(...args);
  } catch (error) {
    // The token may be signed with a new key that only the failed refresh would have returned.
    if (error instanceof errors.JWKSNoMatchingKey) {
      throw new KeySetUnavailableError('Loading the Supabase signing keys failed', { cause });
    }

    throw error;
  }
}
