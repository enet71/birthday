import { Injectable, Logger } from '@nestjs/common';
import { DueUser } from '../types';
import { buildBirthdayNotification, runInChunks } from '../utils';
import { DueNotificationsService } from './due-notifications.service';
import { UserPushService } from './user-push.service';

// Small batches: a run that stops halfway loses at most one batch of claimed users, and the next run picks up the rest.
const CLAIM_BATCH_SIZE = 50;

// Notifies every user whose chosen local hour has come.
@Injectable()
export class BirthdayNotificationsService {
  private readonly logger = new Logger(BirthdayNotificationsService.name);

  constructor(
    private readonly due: DueNotificationsService,
    private readonly userPush: UserPushService,
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

    return payload ? this.userPush.pushToUser(user.userId, payload) : 0;
  }
}
