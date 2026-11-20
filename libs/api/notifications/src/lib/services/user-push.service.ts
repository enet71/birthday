import { Injectable, Logger } from '@nestjs/common';
import { AngularPushPayload, StoredPushSubscription } from '../types';
import { runInChunks } from '../utils';
import { DueNotificationsService } from './due-notifications.service';
import { PushSenderService } from './push-sender.service';

// Sends one notification to every device of a user.
@Injectable()
export class UserPushService {
  private readonly logger = new Logger(UserPushService.name);

  constructor(
    private readonly due: DueNotificationsService,
    private readonly pushSender: PushSenderService,
  ) {}

  // Returns how many devices received it. A device whose subscription is gone for good is forgotten.
  public async pushToUser(userId: string, payload: AngularPushPayload): Promise<number> {
    const message = JSON.stringify(payload);
    const subscriptions = await this.due.findSubscriptions(userId);
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
