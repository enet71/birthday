import { requireEnv } from './env.ts';

// Carries the connect request through Google's consent page. It is signed, so nobody can change it. The completing
// request must come from the same user and send the nonce that only the starting browser tab keeps; the state shows
// up in URLs, so it holds just the nonce hash.
export interface OAuthState {
  userId: string;
  redirectUri: string;
  nonceHash: string;
  expiresAt: number;
}

const STATE_LIFETIME_MS = 10 * 60 * 1000;
const encoder = new TextEncoder();

export async function createOAuthState(userId: string, redirectUri: string, nonce: string): Promise<string> {
  const state: OAuthState = { userId, redirectUri, nonceHash: await hashNonce(nonce), expiresAt: Date.now() + STATE_LIFETIME_MS };
  const body = toBase64Url(encoder.encode(JSON.stringify(state)));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await getKey(), encoder.encode(body)));

  return `${body}.${toBase64Url(signature)}`;
}

// Returns `null` for a missing, forged, or expired state.
export async function readOAuthState(value: string | null): Promise<OAuthState | null> {
  const [body, signature] = value?.split('.') ?? [];

  if (!body || !signature) {
    return null;
  }

  try {
    const isValid = await crypto.subtle.verify('HMAC', await getKey(), fromBase64Url(signature), encoder.encode(body));

    if (!isValid) {
      return null;
    }

    const state: OAuthState = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));

    return state.expiresAt > Date.now() ? state : null;
  } catch {
    return null;
  }
}

export async function hashNonce(nonce: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(nonce))));
}

// The app origins that may receive the user back, for example `https://birthdly.com,http://localhost:4200`.
export function isAllowedRedirectUri(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const origins = requireEnv('APP_ORIGINS')
      .split(',')
      .map((origin) => origin.trim());

    return origins.includes(new URL(value).origin);
  } catch {
    return false;
  }
}

async function getKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey('raw', encoder.encode(requireEnv('GOOGLE_OAUTH_STATE_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (char) => char.charCodeAt(0));
}
