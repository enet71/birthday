// pg-boss queues: mirroring one birthday change into Google, the first sync after connecting, picking the users due for
// a background sync, and one user's background sync.
export const PUSH_QUEUE = 'google-calendar-push';
export const FIRST_SYNC_QUEUE = 'google-calendar-first-sync';
export const POLL_QUEUE = 'google-calendar-poll';
export const BACKGROUND_SYNC_QUEUE = 'google-calendar-background-sync';
// Every minute, so the users due for a sync are spread over time instead of all starting at once.
export const POLL_SCHEDULE = '* * * * *';

// The automatic sync the app starts on opening the calendar.
export const AUTOMATIC_SYNC_INTERVAL_MS = 60 * 1000;
// The server's own sync, so changes from Google reach the reminders of users who do not open the app. An active user is
// synced by the app more often, so the server rarely has to.
export const BACKGROUND_SYNC_INTERVAL_MS = 15 * 60 * 1000;

// `yyyy-MM-dd` birthdays use the year 0004 for an unknown birth year, as in the web app.
export const UNKNOWN_BIRTH_YEAR = '0004';
