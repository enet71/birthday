import { validateEnv } from './env';

describe('validateEnv', () => {
  const databaseUrl = 'postgresql://user:password@localhost:5432/birthday';

  it('applies defaults when optional variables are missing', () => {
    expect(validateEnv({ DATABASE_URL: databaseUrl })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: databaseUrl,
      LOG_LEVEL: 'info',
    });
  });

  it('returns the provided values', () => {
    expect(validateEnv({ NODE_ENV: 'production', PORT: 8080, DATABASE_URL: databaseUrl, LOG_LEVEL: 'debug' })).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      DATABASE_URL: databaseUrl,
      LOG_LEVEL: 'debug',
    });
  });

  it('coerces a PORT string to a number', () => {
    expect(validateEnv({ PORT: '4000', DATABASE_URL: databaseUrl }).PORT).toBe(4000);
  });

  it.each(['0', '65536', '3000.5', 'abc'])('rejects PORT %s', (port: string) => {
    expect(() => validateEnv({ PORT: port, DATABASE_URL: databaseUrl })).toThrow(/PORT/);
  });

  it('throws an error naming DATABASE_URL when it is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it.each(['mysql://user:password@localhost:3306/birthday', 'https://example.com/db', 'not a url'])(
    'rejects the non-Postgres DATABASE_URL %s',
    (url: string) => {
      expect(() => validateEnv({ DATABASE_URL: url })).toThrow(/DATABASE_URL/);
    },
  );

  it.each(['postgres://user:password@localhost:5432/birthday', 'postgresql://user:password@localhost:5432/birthday'])(
    'accepts the Postgres DATABASE_URL %s',
    (url: string) => {
      expect(validateEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
    },
  );

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging', DATABASE_URL: databaseUrl })).toThrow(/NODE_ENV/);
  });

  it('rejects an unknown LOG_LEVEL', () => {
    expect(() => validateEnv({ LOG_LEVEL: 'verbose', DATABASE_URL: databaseUrl })).toThrow(/LOG_LEVEL/);
  });
});
