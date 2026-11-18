# api-google-calendar

Two-way sync of the signed-in user's birthdays with Google: Birthdly's birthdays become birthday events in the user's
primary Google calendar, and the birthdays of the user's Google contacts come into Birthdly.

| Request                                  | Body         | Answer                                                                                      |
| ---------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `GET /api/google-calendar/connection`    |              | `GoogleCalendarConnectionDto` or `null`                                                     |
| `POST /api/google-calendar/complete`     | `{ code }`   | `{ result: 'connected' \| 'denied' }`; 400 for a rejected code, 409 without a refresh token |
| `POST /api/google-calendar/sync`         | `{ manual }` | `GoogleCalendarSyncResponse`                                                                |
| `DELETE /api/google-calendar/connection` |              | 204                                                                                         |

## How it works

- **Connecting.** The web app asks for `GOOGLE_CALENDAR_SCOPES` in the Google Identity Services popup and sends the
  code to `complete`, which exchanges it (`redirect_uri=postmessage`). `OriginGuard` keeps other sites from sending a
  code. Missing scopes answer `denied` and revoke the access. Google returns a refresh token only with a new consent,
  which the popup cannot request. Without one, a connected user keeps the saved token; otherwise the access is revoked
  as well, the answer is 409, and the next attempt asks again. The refresh token is saved encrypted (AES-256-GCM,
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

Google Cloud: the OAuth client is the one used for signing in (its authorized JavaScript origins), and the project
must have the Google Calendar API and the People API enabled. Scopes: `calendar.events.owned`,
`contacts.readonly`.
