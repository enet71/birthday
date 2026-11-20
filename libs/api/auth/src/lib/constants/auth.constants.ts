export const IS_PUBLIC_KEY = 'auth:isPublic';
export const IS_ADMIN_ONLY_KEY = 'auth:isAdminOnly';

// `__Host-` cookies must be Secure, have Path=/ and no Domain, so they reach only this exact origin.
export const SESSION_COOKIE = '__Host-session';
// Carries the nonce that a Google One Tap ID token must contain, so a token issued for another browser is rejected.
export const SIGN_IN_NONCE_COOKIE = '__Host-sign-in';

const DAY_MS = 24 * 60 * 60 * 1000;

// A session ends after 30 days without use, and in any case 180 days after the sign-in.
export const SESSION_IDLE_MS = 30 * DAY_MS;
export const SESSION_MAX_MS = 180 * DAY_MS;
// Using a session moves its end at most once a day, which keeps writes off most requests.
export const SESSION_EXTEND_AFTER_MS = DAY_MS;

export const SIGN_IN_NONCE_MS = 10 * 60 * 1000;

// Google signs ID tokens with either issuer.
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
// The redirect URI of a code that the Google Identity Services popup returned to the page.
export const GOOGLE_POPUP_REDIRECT_URI = 'postmessage';
