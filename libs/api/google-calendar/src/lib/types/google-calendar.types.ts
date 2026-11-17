export interface GoogleCalendarModuleOptions {
  googleClientId: string;
  googleClientSecret: string;
  // The web app's origin; Google may return the user only to a page of it.
  appOrigin: string;
  // 64 hex characters (32 bytes); encrypts the saved Google refresh tokens.
  tokenEncryptionKey: string;
  // Signs the state that travels through Google's consent page.
  oauthStateSecret: string;
}

// A birthday as the sync sees it.
export interface BirthdayRecord {
  id: string;
  userId: string;
  name: string;
  // `yyyy-MM-dd`; see `UNKNOWN_BIRTH_YEAR`.
  birthDate: string;
  // The Google contact the birthday came from; Google shows it already, so Birthdly does not export it.
  googleContactId: string | null;
  googleContactSnapshot: string | null;
  // The id of the birthday's current event in the user's primary Google calendar.
  googleEventId: string | null;
  // Exactly as Postgres stores it, with microseconds, so a write can check that nobody changed the row since.
  updatedAt: string;
  // The same time in milliseconds, to compare with times from Google.
  updatedAtMs: number;
}

export interface ImportSummary {
  added: number;
  updated: number;
  deleted: number;
}

export interface ContactBirthday {
  // The People API resource name, stored in `birthdays.google_contact_id`.
  contactId: string;
  name: string;
  birthDate: string;
  // When Google last changed the source the birthday came from.
  updatedAt: number;
}

// Carries the connect request through Google's consent page. It shows up in URLs, so it holds just the nonce hash.
export interface OAuthState {
  userId: string;
  redirectUri: string;
  nonceHash: string;
  expiresAt: number;
}

export interface GoogleTokens {
  accessToken: string;
  // The granted scopes, separated by spaces.
  scope: string;
  refreshToken: string | null;
}

// The fields of a Calendar API event the sync reads. A deleted event carries only its id for sure.
export interface GoogleEvent {
  id: string;
  status?: string;
  recurringEventId?: string;
  updated?: string;
}

export interface FirstSyncJob {
  userId: string;
}
