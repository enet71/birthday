import { validateEnv } from './env';

describe('validateEnv', () => {
  const databaseUrl = 'postgresql://user:password@localhost:5432/birthday';
  const auth = {
    APP_ORIGIN: 'http://localhost:4200',
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    AUTH_SECRET: 'a'.repeat(32),
    GOOGLE_TOKEN_ENCRYPTION_KEY: 'b'.repeat(64),
    VAPID_PUBLIC_KEY: 'B'.repeat(87),
    VAPID_PRIVATE_KEY: 'd'.repeat(43),
    VAPID_SUBJECT: 'mailto:test@example.com',
  };
  const required = { DATABASE_URL: databaseUrl, ...auth };

  it('applies defaults when optional variables are missing', () => {
    expect(validateEnv(required)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: databaseUrl,
      ...auth,
      LOG_LEVEL: 'info',
    });
  });

  it('returns the provided values', () => {
    expect(validateEnv({ ...required, NODE_ENV: 'production', PORT: 8080, LOG_LEVEL: 'debug' })).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      DATABASE_URL: databaseUrl,
      ...auth,
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
    expect(() => validateEnv(auth)).toThrow(/DATABASE_URL/);
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

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...required, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('rejects an unknown LOG_LEVEL', () => {
    expect(() => validateEnv({ ...required, LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
  });
});
