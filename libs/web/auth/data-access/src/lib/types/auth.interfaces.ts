export interface AuthUser {
  id: string;
  email: string | null;
}

// `unknown` until the stored session has been restored.
export type AuthStatus = 'unknown' | 'signedIn' | 'signedOut';
