import { withSupabase } from 'npm:@supabase/server@1';
import * as webpush from 'jsr:@negrel/webpush@0.5.0';
import { buildBirthdayNotification, NotifiedBirthday } from '../_shared/birthday-notifications.ts';
import { requireEnv } from '../_shared/env.ts';
import { SupabaseAdmin } from '../_shared/google-calendar.ts';

interface DueUser {
  user_id: string;
  local_date: string;
  remind_on_day: boolean;
  remind_day_before: boolean;
}

interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const CLAIM_BATCH_SIZE = 50;
const PARALLEL_SENDS = 5;
// `pg_net` waits 60 seconds; users left unclaimed by then are picked up by the next run 15 minutes later.
const RUN_BUDGET_MS = 40_000;
// The push library takes no abort signal, so a slow push service is cut off by a timer instead.
const PUSH_TIMEOUT_MS = 10_000;
const MAX_RETRY_DELAY_MS = 5_000;
// A day's notification is stale after it; the push service drops it instead of delivering it late.
const TTL_SECONDS = 12 * 60 * 60;
// The push service answers these when the subscription can never work again, for example after the user blocked
// notifications, or when it was made with another VAPID key.
const DEAD_SUBSCRIPTION_STATUSES = [400, 403, 404, 410];

class PushTimeoutError extends Error {}

// Notifies the users whose chosen local hour has come. Only `pg_cron` calls it, every 15 minutes, with the secret key.
export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    const startedAt = Date.now();
    // Before claiming anyone, so a broken VAPID secret does not use up the users' notifications for the day.
    const appServer = await createApplicationServer();
    let sent = 0;

    while (Date.now() - startedAt < RUN_BUDGET_MS) {
      const { data: dueUsers, error } = await ctx.supabaseAdmin.rpc('claim_due_birthday_notifications', { batch_size: CLAIM_BATCH_SIZE });

      if (error) {
        console.error('Claiming due birthday notifications failed:', error);
        return Response.json({ error: 'Sending failed', sent }, { status: 500 });
      }
      if (!dueUsers.length) {
        break;
      }

      // One user failing must not keep the others from their notifications.
      const results = await runInChunks(dueUsers as DueUser[], (user: DueUser) => notifyUser(ctx.supabaseAdmin, appServer, user));

      results.forEach((result: PromiseSettledResult<number>, index: number) => {
        if (result.status === 'fulfilled') {
          sent += result.value;
        } else {
          console.error(`Notifying user ${(dueUsers as DueUser[])[index].user_id} failed:`, result.reason);
        }
      });
    }

    return Response.json({ sent });
  }),
};

async function createApplicationServer(): Promise<webpush.ApplicationServer> {
  // The JSON printed by `npm run push:vapid-keys`: the public and private key as JWK.
  const vapidKeys = await webpush.importVapidKeys(JSON.parse(requireEnv('VAPID_KEYS')));

  return webpush.ApplicationServer.new({ contactInformation: requireEnv('VAPID_SUBJECT'), vapidKeys });
}

// Returns how many devices received the notification.
async function notifyUser(supabaseAdmin: SupabaseAdmin, appServer: webpush.ApplicationServer, user: DueUser): Promise<number> {
  const { data: birthdays, error: birthdaysError } = await supabaseAdmin.rpc('get_notification_birthdays', {
    target_user_id: user.user_id,
    local_date: user.local_date,
  });

  if (birthdaysError) {
    throw birthdaysError;
  }

  const payload = buildBirthdayNotification(birthdays as NotifiedBirthday[], {
    localDate: user.local_date,
    remindOnDay: user.remind_on_day,
    remindDayBefore: user.remind_day_before,
  });

  if (!payload) {
    return 0;
  }

  const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user.user_id);

  if (subscriptionsError) {
    throw subscriptionsError;
  }

  const message = JSON.stringify(payload);
  const results = await runInChunks(subscriptions as StoredSubscription[], (subscription: StoredSubscription) =>
    pushToSubscription(supabaseAdmin, appServer, subscription, message),
  );

  return results.filter((result: PromiseSettledResult<boolean>) => result.status === 'fulfilled' && result.value).length;
}

// Returns whether the push service accepted the message. Retries once when the service is busy.
async function pushToSubscription(
  supabaseAdmin: SupabaseAdmin,
  appServer: webpush.ApplicationServer,
  subscription: StoredSubscription,
  message: string,
): Promise<boolean> {
  const subscriber = appServer.subscribe({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } });

  for (let attempt = 1; ; attempt++) {
    try {
      await withTimeout(subscriber.pushTextMessage(message, { ttl: TTL_SECONDS, urgency: webpush.Urgency.High }), PUSH_TIMEOUT_MS);
      return true;
    } catch (pushError) {
      const status = pushError instanceof webpush.PushMessageError ? pushError.response.status : null;

      if (status !== null && DEAD_SUBSCRIPTION_STATUSES.includes(status)) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', subscription.id);
        return false;
      }
      if (attempt === 1 && (status === 429 || (status !== null && status >= 500))) {
        await delay(getRetryDelay(pushError as webpush.PushMessageError));
        continue;
      }

      console.error(`Pushing to subscription ${subscription.id} failed:`, pushError instanceof PushTimeoutError ? 'timed out' : pushError);
      return false;
    }
  }
}

async function runInChunks<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];

  for (let start = 0; start < items.length; start += PARALLEL_SENDS) {
    results.push(...(await Promise.allSettled(items.slice(start, start + PARALLEL_SENDS).map(task))));
  }

  return results;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new PushTimeoutError()), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function getRetryDelay(error: webpush.PushMessageError): number {
  const seconds = Number(error.response.headers.get('Retry-After'));

  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_RETRY_DELAY_MS) : 1000;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
