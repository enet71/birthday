# api-google-calendar

Two-way sync of the signed-in user's birthdays with Google: Birthdly's birthdays become birthday events in the user's
primary Google calendar, and the birthdays of the user's Google contacts come into Birthdly.

| Request                                  | Body                     | Answer                                                                         |
| ---------------------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `GET /api/google-calendar/connection`    |                          | `GoogleCalendarConnectionDto` or `null`                                        |
| `POST /api/google-calendar/connect`      | `{ redirectUri, nonce }` | `{ url }` of Google's consent page                                             |
| `POST /api/google-calendar/complete`     | `{ code, state, nonce }` | `{ result: 'connected' \| 'denied' }`; 400/403 for a forged or foreign request |
| `POST /api/google-calendar/sync`         | `{ manual }`             | `GoogleCalendarSyncResponse`                                                   |
| `DELETE /api/google-calendar/connection` |                          | 204                                                                            |

## How it works

- **Connecting.** `connect` signs a state with the user id, the redirect URI (an app page on `APP_ORIGIN`) and the hash
  of a nonce the browser tab keeps. Google returns to the app page, which sends `code`, `state` and the nonce to
  `complete`; only the same user and tab can finish. The refresh token is saved encrypted (AES-256-GCM,
  `GOOGLE_TOKEN_ENCRYPTION_KEY`) and never leaves the API. The first sync runs as a job.
- **Export.** `BirthdaysService` reports every change to `BirthdayChangesListener`; this module provides it and queues
  the change in pg-boss (`google-calendar-push`), when the user is connected. The worker reads the current row, so
  changes arriving out of order do no harm, and retries failures with growing pauses.
- **Import** (`sync`, and the first sync): contact birthdays are added or linked (same name and date), later Google
  changes win over earlier Birthdly edits, and a deletion of a Birthdly event in Google deletes the birthday unless it
  was changed in Birthdly later. A lease on the connection row keeps two syncs of one user apart; an automatic sync runs
  at most once an hour, "Sync now" (`manual`) also reconciles every event.
- **Disconnecting** forgets and deletes Birthdly's events in Google, revokes the access and drops the token; the
  birthdays stay.

Google Cloud: the API's OAuth client must list `<APP_ORIGIN>/settings/google-calendar` as a redirect URI, and the
project must have the Google Calendar API and the People API enabled. Scopes: `calendar.events.owned`,
`contacts.readonly`.
