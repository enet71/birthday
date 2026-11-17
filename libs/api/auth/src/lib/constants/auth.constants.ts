export const IS_PUBLIC_KEY = 'auth:isPublic';

// `__Host-` cookies must be Secure, have Path=/ and no Domain, so they reach only this exact origin.
export const SESSION_COOKIE = '__Host-session';
// Carries the state of one sign-in between the redirect to Google and its callback.
export const SIGN_IN_FLOW_COOKIE = '__Host-sign-in';

const DAY_MS = 24 * 60 * 60 * 1000;

// A session ends after 30 days without use, and in any case 180 days after the sign-in.
export const SESSION_IDLE_MS = 30 * DAY_MS;
export const SESSION_MAX_MS = 180 * DAY_MS;
// Using a session moves its end at most once a day, which keeps writes off most requests.
export const SESSION_EXTEND_AFTER_MS = DAY_MS;

export const SIGN_IN_FLOW_MS = 10 * 60 * 1000;

export const GOOGLE_ISSUER = 'https://accounts.google.com';
export const GOOGLE_SCOPES = 'openid email profile';
export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';
