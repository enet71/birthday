# api-notifications

Sends the daily birthday push notifications. The settings and the devices' push subscriptions are stored by
`api-reminders`; this library only reads them.

## How it works

- A pg-boss schedule (`birthday-notifications`, every 15 minutes, UTC) starts one run at a time, even with several API
  instances.
- A run claims due users in batches of 50: users whose chosen local hour or the next one has come, who have a device,
  and who were not notified on that local date yet. The claim is a row in `notification_deliveries`, written before
  sending, so a user is never notified twice a day. Rows older than a week are deleted.
- For each user it reads only the birthdays of the local day, the next day and Feb 29, builds one notification in the
  user's language (`buildBirthdayNotification`: today and/or tomorrow, Feb 29 on Feb 28 in other years, long name lists
  cut) and sends it to every device with `web-push`. Nothing is sent when no birthday matches.
- A push service answering 400/403/404/410 means the subscription is gone for good; it is deleted. 429 and 5xx are
  retried once. One user or device failing never stops the others.

## VAPID keys

`npm run push:vapid-keys` prints a new pair. `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` go to the API's environment,
and the public key also to `vapidPublicKey` in `apps/web/src/app/app.config.ts`. A new pair makes every existing
browser subscription stop working: push services reject it with 403, the subscription is deleted, and the user has to
turn notifications on again in Settings, which replaces the browser's old subscription. The API refuses to start when the keys are malformed or the private key does not
belong to the public key. It cannot check that the public key equals the web app's `vapidPublicKey`: compare them when
deploying, because a mismatch makes push services reject every message and the first run deletes every subscription.
