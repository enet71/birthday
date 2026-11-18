import { Injectable, Logger } from '@nestjs/common';
import { DueUser, StoredPushSubscription } from '../types';
import { buildBirthdayNotification } from '../utils';
import { DueNotificationsService } from './due-notifications.service';
import { PushSenderService } from './push-sender.service';

// Small batches: a run that stops halfway loses at most one batch of claimed users, and the next run picks up the rest.
const CLAIM_BATCH_SIZE = 50;
const PARALLEL_SENDS = 5;

// Notifies every user whose chosen local hour has come.
@Injectable()
export class BirthdayNotificationsService {
  private readonly logger = new Logger(BirthdayNotificationsService.name);

  constructor(
    private readonly due: DueNotificationsService,
    private readonly pushSender: PushSenderService,
  ) {}

  // Returns how many devices received a notification. Stops before the next batch once `signal` is aborted; the users
  // not claimed yet are picked up by the next run.
  public async sendDue(signal: AbortSignal): Promise<number> {
    let sent = 0;

    await this.due.forgetOldDeliveries();
    while (!signal.aborted) {
      const users = await this.due.claimDueUsers(CLAIM_BATCH_SIZE);

      if (users.length === 0) {
        break;
      }
      // One user failing must not keep the others from their notifications.
      const results = await runInChunks(users, (user) => this.notifyUser(user));

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          sent += result.value;
        } else {
          this.logger.error({ err: result.reason, userId: users[index].userId }, 'Notifying a user failed');
        }
      });
    }

    return sent;
  }

  // Returns how many of the user's devices received the notification.
  private async notifyUser(user: DueUser): Promise<number> {
    const birthdays = await this.due.findBirthdaysAround(user.userId, user.localDate);
    const payload = buildBirthdayNotification(birthdays, user);

    if (!payload) {
      return 0;
    }

    const message = JSON.stringify(payload);
    const subscriptions = await this.due.findSubscriptions(user.userId);
    const results = await runInChunks(subscriptions, (subscription) => this.push(subscription, message));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error({ err: result.reason, subscriptionId: subscriptions[index].id }, 'Handling a push subscription failed');
      }
    });
    return results.filter((result) => result.status === 'fulfilled' && result.value).length;
  }

  private async push(subscription: StoredPushSubscription, message: string): Promise<boolean> {
    const result = await this.pushSender.send(subscription, message);

    if (result === 'gone') {
      await this.due.deleteSubscription(subscription.id);
    }
    return result === 'sent';
  }
}

async function runInChunks<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];

  for (let start = 0; start < items.length; start += PARALLEL_SENDS) {
    results.push(...(await Promise.allSettled(items.slice(start, start + PARALLEL_SENDS).map(task))));
  }

  return results;
}
