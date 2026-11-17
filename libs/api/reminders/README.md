# api-reminders

Birthday notification settings and push subscriptions of the signed-in user. Sending the notifications is not part of
this library.

| Request                                | Body                         | Answer                              |
| -------------------------------------- | ---------------------------- | ----------------------------------- |
| `GET /api/reminders/settings`          |                              | `ReminderSettingsDto` or `null`     |
| `PUT /api/reminders/settings`          | `ReminderSettingsDto`        | the saved settings                  |
| `PUT /api/reminders/settings/device`   | `{ timeZone, locale }`       | the settings, created with defaults |
| `PATCH /api/reminders/settings/locale` | `{ locale }`                 | 204; no change without settings     |
| `PUT /api/push-subscriptions`          | `{ endpoint, p256dh, auth }` | 204; saving again replaces the keys |
| `POST /api/push-subscriptions/lookup`  | `{ endpoint }`               | `{ exists }`                        |
| `DELETE /api/push-subscriptions`       | `{ endpoint }`               | 204, also without such a device     |

- The database stores `days` as two flags, `remind_on_day` and `remind_day_before`; at least one must be on.
- The push endpoint addresses a device, so it travels only in request bodies, never in URLs, which are logged. Saving accepts
  only the browsers' push services, because the server will send requests to that URL; lookups and deletes accept any
  endpoint.
- The zod schemas in `src/lib/schemas` apply the database's limits and reject unknown fields; the API answers a failing
  body with 400. Every query filters by the signed-in user.
