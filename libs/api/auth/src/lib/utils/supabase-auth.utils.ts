// The Supabase Auth base URL; it is also the `iss` claim of the project's access tokens.
export function getSupabaseAuthUrl(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
}

export function getSupabaseJwksUrl(supabaseUrl: string): URL {
  return new URL(`${getSupabaseAuthUrl(supabaseUrl)}/.well-known/jwks.json`);
}

// Returns the token of an `Authorization: Bearer <token>` header, or `null` for any other value.
export function extractBearerToken(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);

  return match ? match[1] : null;
}
