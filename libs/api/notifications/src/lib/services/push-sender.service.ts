import { Inject, Injectable, Logger } from '@nestjs/common';
import { createECDH } from 'node:crypto';
import { sendNotification, setVapidDetails, WebPushError } from 'web-push';
import { MODULE_OPTIONS_TOKEN } from '../notifications.module-definition';
import { NotificationsModuleOptions, PushResult, StoredPushSubscription } from '../types';

// A day's notification is stale after it; the push service drops it instead of delivering it late.
const TTL_SECONDS = 12 * 60 * 60;
// A socket timeout: a push service that stops answering cannot hold the run.
const PUSH_TIMEOUT_MS = 10_000;
const MAX_RETRY_DELAY_MS = 5_000;
// The push service answers these when the subscription can never work again, for example after the user blocked
// notifications, or when it was made with another VAPID key.
const GONE_STATUSES = [400, 403, 404, 410];

// Sends Web Push messages (encrypted per RFC 8291 and signed with the VAPID key by `web-push`).
@Injectable()
export class PushSenderService {
  private readonly logger = new Logger(PushSenderService.name);

  // Checks the VAPID keys when the API starts, so broken keys stop the deployment. A private key from another pair would
  // pass `web-push`'s own check, and push services would then reject every message with 403, which deletes every
  // subscription. Whether the public key also equals the web app's `vapidPublicKey` cannot be checked here.
  constructor(@Inject(MODULE_OPTIONS_TOKEN) options: NotificationsModuleOptions) {
    setVapidDetails(options.vapidSubject, options.vapidPublicKey, options.vapidPrivateKey);
    if (derivePublicKey(options.vapidPrivateKey) !== options.vapidPublicKey) {
      throw new Error('VAPID_PRIVATE_KEY does not belong to VAPID_PUBLIC_KEY');
    }
  }

  // Retries once when the push service is busy.
  public async send(subscription: StoredPushSubscription, message: string): Promise<PushResult> {
    const target = { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } };

    for (let attempt = 1; ; attempt++) {
      try {
        await sendNotification(target, message, { TTL: TTL_SECONDS, urgency: 'high', timeout: PUSH_TIMEOUT_MS });
        return 'sent';
      } catch (error) {
        const status = error instanceof WebPushError ? error.statusCode : null;

        if (status !== null && GONE_STATUSES.includes(status)) {
          return 'gone';
        }
        if (attempt === 1 && status !== null && (status === 429 || status >= 500)) {
          await delay(getRetryDelay(error as WebPushError));
          continue;
        }

        // The endpoint addresses the user's device, so only the subscription id is logged.
        this.logger.warn({ subscriptionId: subscription.id, status, message: (error as Error).message }, 'Sending a push notification failed');
        return 'failed';
      }
    }
  }
}

// The uncompressed P-256 public key of a private key, base64url, as `npm run push:vapid-keys` prints it.
function derivePublicKey(privateKey: string): string {
  const ecdh = createECDH('prime256v1');

  ecdh.setPrivateKey(Buffer.from(privateKey, 'base64url'));
  return ecdh.getPublicKey('base64url');
}

function getRetryDelay(error: WebPushError): number {
  // `web-push` passes Node's response headers, a plain object, although its types say `Headers`.
  const seconds = Number((error.headers as unknown as Record<string, string | undefined>)['retry-after']);

  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_RETRY_DELAY_MS) : 1000;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
