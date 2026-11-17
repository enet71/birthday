import { createHash } from 'node:crypto';
import { createSessionToken, hashSessionToken } from './session-token.utils';

describe('createSessionToken', () => {
  it('creates 256 random bits as a 43-character base64url string', () => {
    expect(createSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('creates a different token every time', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => createSessionToken()));

    expect(tokens.size).toBe(100);
  });
});

describe('hashSessionToken', () => {
  it('returns the hex SHA-256 of the token', () => {
    const hash = hashSessionToken('token');

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(createHash('sha256').update('token').digest('hex'));
  });

  it('returns the same hash for the same token and another one for another token', () => {
    expect(hashSessionToken('token')).toBe(hashSessionToken('token'));
    expect(hashSessionToken('token')).not.toBe(hashSessionToken('other-token'));
  });
});
