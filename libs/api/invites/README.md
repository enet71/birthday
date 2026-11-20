# api-invites

Invite links: a signed-in user shares one link, and guests send their birthdays to the user without signing in. Each
submission waits for the user to add it as a birthday or reject it.

| Request                                       | Who   | Answer                                                                    |
| --------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| `GET /api/invites/link`                       | owner | `InviteLinkResponse`; `link` is null until it is created                  |
| `PUT /api/invites/link`                       | owner | `SaveInviteLinkRequest` → `InviteLinkDto`; creates the link on first use  |
| `POST /api/invites/link/token`                | owner | `InviteLinkDto` with a new token; the old link stops working; 404 if none |
| `GET /api/invites/submissions`                | owner | `InviteSubmissionDto[]`, oldest first                                     |
| `POST /api/invites/submissions/:id/approve`   | owner | `BirthdayDto` of the added birthday; the submission is removed            |
| `DELETE /api/invites/submissions/:id`         | owner | 204                                                                       |
| `GET /api/invites/public/:token`              | guest | `PublicInviteDto`; 404 for a disabled, reissued, or unknown link          |
| `POST /api/invites/public/:token/submissions` | guest | `CreateInviteSubmissionRequest` → 204                                     |

Approving adds the birthday through `BirthdaysService`, so reminders and the Google Calendar sync pick it up like any
other.

Spam protection on guest submissions:

- `website` is a honeypot the form hides; a submission that fills it answers 204 and is dropped.
- At most `MAX_PENDING_SUBMISSIONS` wait per owner; more answer 409.
- `SUBMISSION_THROTTLERS` limit submissions per IP address (429). They count in memory, which is enough for the single
  API instance.
