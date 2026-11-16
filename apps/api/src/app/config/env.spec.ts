import { validateEnv } from './env';

describe('validateEnv', () => {
  const databaseUrl = 'postgresql://user:password@localhost:5432/birthday';
  const supabaseUrl = 'http://127.0.0.1:54321';
  const required = { DATABASE_URL: databaseUrl, SUPABASE_URL: supabaseUrl };

  it('applies defaults when optional variables are missing', () => {
    expect(validateEnv(required)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: databaseUrl,
      SUPABASE_URL: supabaseUrl,
      LOG_LEVEL: 'info',
    });
  });

  it('returns the provided values', () => {
    expect(validateEnv({ ...required, NODE_ENV: 'production', PORT: 8080, LOG_LEVEL: 'debug' })).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      DATABASE_URL: databaseUrl,
      SUPABASE_URL: supabaseUrl,
      LOG_LEVEL: 'debug',
    });
  });

  it('coerces a PORT string to a number', () => {
    expect(validateEnv({ ...required, PORT: '4000' }).PORT).toBe(4000);
  });

  it.each(['0', '65536', '3000.5', 'abc'])('rejects PORT %s', (port: string) => {
    expect(() => validateEnv({ ...required, PORT: port })).toThrow(/PORT/);
  });

  it('throws an error naming DATABASE_URL when it is missing', () => {
    expect(() => validateEnv({ SUPABASE_URL: supabaseUrl })).toThrow(/DATABASE_URL/);
  });

  it.each(['mysql://user:password@localhost:3306/birthday', 'https://example.com/db', 'not a url'])(
    'rejects the non-Postgres DATABASE_URL %s',
    (url: string) => {
      expect(() => validateEnv({ ...required, DATABASE_URL: url })).toThrow(/DATABASE_URL/);
    },
  );

  it.each(['postgres://user:password@localhost:5432/birthday', 'postgresql://user:password@localhost:5432/birthday'])(
    'accepts the Postgres DATABASE_URL %s',
    (url: string) => {
      expect(validateEnv({ ...required, DATABASE_URL: url }).DATABASE_URL).toBe(url);
    },
  );

  it('throws an error naming SUPABASE_URL when it is missing', () => {
    expect(() => validateEnv({ DATABASE_URL: databaseUrl })).toThrow(/SUPABASE_URL/);
  });

  it.each(['ftp://project.supabase.co', 'postgresql://user:password@localhost:5432/birthday', 'not a url', ''])(
    'rejects the non-HTTP SUPABASE_URL %j',
    (url: string) => {
      expect(() => validateEnv({ ...required, SUPABASE_URL: url })).toThrow(/SUPABASE_URL/);
    },
  );

  it.each(['http://127.0.0.1:54321', 'https://project.supabase.co'])('accepts the HTTP SUPABASE_URL %s', (url: string) => {
    expect(validateEnv({ ...required, SUPABASE_URL: url }).SUPABASE_URL).toBe(url);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...required, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('rejects an unknown LOG_LEVEL', () => {
    expect(() => validateEnv({ ...required, LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
  });
});
