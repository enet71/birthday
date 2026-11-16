export const IS_PUBLIC_KEY = 'auth:isPublic';
export const JWT_KEY_SET = Symbol('JWT_KEY_SET');

// Supabase signs access tokens with the project's asymmetric ES256 key and publishes it in the JWKS.
export const SUPABASE_JWT_ALGORITHM = 'ES256';
export const AUTHENTICATED_ROLE = 'authenticated';
