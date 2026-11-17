import { SIGN_IN_FAILED, SIGN_IN_RESULT_PARAM } from '@birthday/shared-models';

const BASE = 'https://return-to.invalid';
const MAX_LENGTH = 2000;

// Keeps only a path on this site, so a crafted sign-in link cannot send the user to another site afterwards
// (`//evil.example`, `/\evil.example` and absolute URLs resolve to another origin and fall back to `/`).
export function toSafeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.length > MAX_LENGTH) {
    return '/';
  }

  const path = normalize(value);

  // Normalizing removes dot segments, so `/.//evil.example` becomes `//evil.example`, which a browser reads as another
  // host. The result is therefore checked again: it must not start like a host and must stay the same when resolved.
  return path !== null && !/^\/[/\\]/.test(path) && normalize(path) === path ? path : '/';
}

// The path, query and fragment of `value` resolved on this site, or `null` when it leaves the site.
function normalize(value: string): string | null {
  try {
    const url = new URL(value, BASE);

    return url.origin === BASE ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch {
    return null;
  }
}

// The page to return to, marked so the web app reports that the sign-in did not complete.
export function withSignInFailed(returnTo: string): string {
  const url = new URL(toSafeReturnTo(returnTo), BASE);

  url.searchParams.set(SIGN_IN_RESULT_PARAM, SIGN_IN_FAILED);
  return `${url.pathname}${url.search}${url.hash}`;
}
