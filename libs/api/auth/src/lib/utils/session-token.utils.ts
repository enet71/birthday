import { createHash, randomBytes } from 'node:crypto';

// 256 random bits: guessing a session is not feasible.
export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

// The database stores only this hash. A fast hash is enough because the token itself is random, not a password.
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
