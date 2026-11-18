import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job, PgBoss } from 'pg-boss';
import { PG_BOSS } from '@birthday/api-jobs';
import { NOTIFICATIONS_QUEUE, NOTIFICATIONS_SCHEDULE } from '../constants';
import { BirthdayNotificationsService } from './birthday-notifications.service';

// `stately`: at most one run waits while another runs, so slow runs never pile up. A failed run is not retried; the
// next one, 15 minutes later, picks up the users that were not claimed.
const QUEUE_OPTIONS = { policy: 'stately', retryLimit: 0, expireInSeconds: 10 * 60 } as const;

// Runs the notification sending on a schedule. pg-boss starts each scheduled run once, even with several API instances.
@Injectable()
export class NotificationsJobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationsJobsService.name);

  constructor(
    @Inject(PG_BOSS) private readonly boss: PgBoss,
    private readonly notifications: BirthdayNotificationsService,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    // `createQueue` keeps an existing queue's settings, so changed options need `updateQueue` too.
    await this.boss.createQueue(NOTIFICATIONS_QUEUE, QUEUE_OPTIONS);
    await this.boss.updateQueue(NOTIFICATIONS_QUEUE, { retryLimit: QUEUE_OPTIONS.retryLimit, expireInSeconds: QUEUE_OPTIONS.expireInSeconds });
    // `once`: after the API was down, one run catches up instead of none.
    await this.boss.schedule(NOTIFICATIONS_QUEUE, NOTIFICATIONS_SCHEDULE, null, { tz: 'UTC', missed: 'once' });
    await this.boss.work(NOTIFICATIONS_QUEUE, ([job]: Job[]) => this.run(job.signal));
  }

  // pg-boss aborts `signal` when the run outlives `expireInSeconds`; the run then stops after the current batch.
  private async run(signal: AbortSignal): Promise<void> {
    const sent = await this.notifications.sendDue(signal);

    if (sent > 0) {
      this.logger.log({ sent }, 'Birthday notifications sent');
    }
  }
}
