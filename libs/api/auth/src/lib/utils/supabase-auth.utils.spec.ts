import { extractBearerToken, getSupabaseAuthUrl, getSupabaseJwksUrl } from './supabase-auth.utils';

describe('getSupabaseAuthUrl', () => {
  it.each([
    ['https://project.supabase.co', 'https://project.supabase.co/auth/v1'],
    ['https://project.supabase.co/', 'https://project.supabase.co/auth/v1'],
    ['https://project.supabase.co///', 'https://project.supabase.co/auth/v1'],
    ['http://127.0.0.1:54321', 'http://127.0.0.1:54321/auth/v1'],
  ])('returns the Auth URL for %s', (supabaseUrl: string, expected: string) => {
    expect(getSupabaseAuthUrl(supabaseUrl)).toBe(expected);
  });
});

describe('getSupabaseJwksUrl', () => {
  it.each([
    ['https://project.supabase.co', 'https://project.supabase.co/auth/v1/.well-known/jwks.json'],
    ['https://project.supabase.co/', 'https://project.supabase.co/auth/v1/.well-known/jwks.json'],
    ['http://127.0.0.1:54321', 'http://127.0.0.1:54321/auth/v1/.well-known/jwks.json'],
  ])('returns the JWKS URL for %s', (supabaseUrl: string, expected: string) => {
    expect(getSupabaseJwksUrl(supabaseUrl).href).toBe(expected);
  });

  it('throws for a value that is not a URL', () => {
    expect(() => getSupabaseJwksUrl('not a url')).toThrow(TypeError);
  });
});

describe('extractBearerToken', () => {
  it.each([
    ['Bearer abc.def.ghi', 'abc.def.ghi'],
    ['bearer abc.def.ghi', 'abc.def.ghi'],
    ['BEARER abc.def.ghi', 'abc.def.ghi'],
    ['Bearer   abc.def.ghi', 'abc.def.ghi'],
  ])('returns the token of %j', (header: string, expected: string) => {
    expect(extractBearerToken(header)).toBe(expected);
  });

  it.each([undefined, '', 'Bearer', 'Bearer ', 'Basic dXNlcjpwYXNz', 'Bearer abc def', 'abc.def.ghi', ' Bearer abc', 'Bearer abc '])(
    'returns null for %j',
    (header: string | undefined) => {
      expect(extractBearerToken(header)).toBeNull();
    },
  );
});
