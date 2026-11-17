// `calendar.events.owned` writes birthday events into the user's primary calendar; `contacts.readonly` reads the
// birthdays of the user's Google contacts.
export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events.owned', 'https://www.googleapis.com/auth/contacts.readonly'];

// pg-boss queues: mirroring one birthday change into Google, and the first sync after connecting.
export const PUSH_QUEUE = 'google-calendar-push';
export const FIRST_SYNC_QUEUE = 'google-calendar-first-sync';

// `yyyy-MM-dd` birthdays use the year 0004 for an unknown birth year, as in the web app.
export const UNKNOWN_BIRTH_YEAR = '0004';
