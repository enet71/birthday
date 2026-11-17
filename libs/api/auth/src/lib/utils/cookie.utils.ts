import { parse } from 'cookie';
import type { CookieOptions, Request } from 'express';

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.cookie;

  return header ? (parse(header)[name] ?? null) : null;
}

// HttpOnly keeps scripts from reading the cookie; Lax still sends it on the top-level redirect back from Google.
export function secureCookieOptions(maxAgeMs?: number): CookieOptions {
  return { httpOnly: true, secure: true, sameSite: 'lax', path: '/', ...(maxAgeMs !== undefined && { maxAge: maxAgeMs }) };
}
