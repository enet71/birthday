import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job, JobInsert, PgBoss } from 'pg-boss';
import { BirthdayChange } from '@birthday/api-birthdays';
import { PG_BOSS } from '@birthday/api-jobs';
import { BACKGROUND_SYNC_INTERVAL_MS, BACKGROUND_SYNC_QUEUE, FIRST_SYNC_QUEUE, POLL_QUEUE, POLL_SCHEDULE, PUSH_QUEUE } from '../constants';
import { GoogleAccessRevokedError } from '../errors';
import { BackgroundSyncJob, FirstSyncJob } from '../types';
import { GoogleCalendarEventsService } from './google-calendar-events.service';
import { GoogleConnectionsService } from './google-connections.service';
import { GoogleImportService } from './google-import.service';

// A push retries for about half an hour with growing pauses (10 s, 20 s, 40 s, ...), which outlasts a short Google or
// network outage. The first sync can take minutes for a large account.
const PUSH_QUEUE_OPTIONS = { retryLimit: 6, retryDelay: 10, retryBackoff: true, expireInSeconds: 2 * 60 };
const FIRST_SYNC_QUEUE_OPTIONS = { retryLimit: 3, retryDelay: 60, retryBackoff: true, expireInSeconds: 15 * 60 };
// `stately`: a slow pass never piles up behind the next one. A failed pass is not retried; the next minute's is.
const POLL_QUEUE_OPTIONS = { policy: 'stately', retryLimit: 0, expireInSeconds: 60 } as const;
// `short` with the user as `singletonKey`: at most one waiting sync per user. A failed sync is not retried; the user is
// due again after the interval.
const BACKGROUND_SYNC_QUEUE_OPTIONS = { policy: 'short', retryLimit: 0, expireInSeconds: 10 * 60 } as const;
// Keeps the People API's stricter quota for full reads in reach when many users are due at once.
const USERS_PER_POLL = 50;

// Declares the Google Calendar queues and works their jobs. A job that throws is retried; one that ends because Google
// no longer accepts the access is not, because retrying cannot help.
@Injectable()
export class GoogleCalendarJobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GoogleCalendarJobsService.name);

  constructor(
    @Inject(PG_BOSS) private readonly boss: PgBoss,
    private readonly connections: GoogleConnectionsService,
    private readonly events: GoogleCalendarEventsService,
    private readonly importService: GoogleImportService,
  ) {}

  // A job that runs before the database migrations finished fails and is retried later.
  public async onApplicationBootstrap(): Promise<void> {
    // `createQueue` keeps an existing queue's settings, so changed options need `updateQueue` too.
    await this.boss.createQueue(PUSH_QUEUE, PUSH_QUEUE_OPTIONS);
    await this.boss.updateQueue(PUSH_QUEUE, PUSH_QUEUE_OPTIONS);
    await this.boss.createQueue(FIRST_SYNC_QUEUE, FIRST_SYNC_QUEUE_OPTIONS);
    await this.boss.updateQueue(FIRST_SYNC_QUEUE, FIRST_SYNC_QUEUE_OPTIONS);
    await this.boss.createQueue(POLL_QUEUE, POLL_QUEUE_OPTIONS);
    await this.boss.updateQueue(POLL_QUEUE, { retryLimit: POLL_QUEUE_OPTIONS.retryLimit, expireInSeconds: POLL_QUEUE_OPTIONS.expireInSeconds });
    await this.boss.createQueue(BACKGROUND_SYNC_QUEUE, BACKGROUND_SYNC_QUEUE_OPTIONS);
    await this.boss.updateQueue(BACKGROUND_SYNC_QUEUE, {
      retryLimit: BACKGROUND_SYNC_QUEUE_OPTIONS.retryLimit,
      expireInSeconds: BACKGROUND_SYNC_QUEUE_OPTIONS.expireInSeconds,
    });
    // pg-boss starts each scheduled pass once, even with several API instances.
    await this.boss.schedule(POLL_QUEUE, POLL_SCHEDULE, null, { tz: 'UTC' });
    // Several jobs at once, so one user's slow Google requests do not hold back everyone else's.
    await this.boss.work<BirthdayChange>(PUSH_QUEUE, { localConcurrency: 5 }, ([job]: Job<BirthdayChange>[]) => this.push(job.data));
    await this.boss.work<FirstSyncJob>(FIRST_SYNC_QUEUE, { localConcurrency: 2 }, ([job]: Job<FirstSyncJob>[]) => this.runFirstSync(job.data));
    await this.boss.work(POLL_QUEUE, () => this.enqueueDueSyncs());
    await this.boss.work<BackgroundSyncJob>(BACKGROUND_SYNC_QUEUE, { localConcurrency: 5 }, ([job]: Job<BackgroundSyncJob>[]) =>
      this.runBackgroundSync(job.data),
    );
  }

  public async enqueueFirstSync(userId: string): Promise<void> {
    const job: FirstSyncJob = { userId };

    await this.boss.send(FIRST_SYNC_QUEUE, job);
  }

  private async push(change: BirthdayChange): Promise<void> {
    // The user disconnected after the change was queued.
    if (!(await this.connections.isConnected(change.userId))) {
      return;
    }

    try {
      const accessToken = await this.connections.getAccessToken(change.userId);

      await this.events.syncBirthdayEvent(change.userId, accessToken, change.birthdayId, change.deletedGoogleEventId);
    } catch (error) {
      if (!(error instanceof GoogleAccessRevokedError)) {
        throw error;
      }
    }
  }

  // Imports from Google and exports every birthday right after connecting. The app's automatic sync may hold the lease
  // when this job starts late; failing makes pg-boss retry it, because only this sync exports every birthday.
  private async runFirstSync({ userId }: FirstSyncJob): Promise<void> {
    try {
      const summary = await this.importService.runSync(userId, { minIntervalMs: 0, full: true });

      if (!summary && (await this.connections.isConnected(userId))) {
        throw new Error('The first Google sync waits for another sync of the user to finish');
      }
    } catch (error) {
      if (!(error instanceof GoogleAccessRevokedError)) {
        throw error;
      }
    }
  }

  private async enqueueDueSyncs(): Promise<void> {
    const userIds = await this.connections.findDueForSync(new Date(Date.now() - BACKGROUND_SYNC_INTERVAL_MS), USERS_PER_POLL);
    const jobs: JobInsert<BackgroundSyncJob>[] = userIds.map((userId) => ({ data: { userId }, singletonKey: userId }));

    if (jobs.length > 0) {
      await this.boss.insert(BACKGROUND_SYNC_QUEUE, jobs);
    }
  }

  // Reads only the changes since the last sync. The app may have synced the user since the job was queued; then the
  // interval check skips it.
  private async runBackgroundSync({ userId }: BackgroundSyncJob): Promise<void> {
    try {
      await this.importService.runSync(userId, { minIntervalMs: BACKGROUND_SYNC_INTERVAL_MS, full: false });
    } catch (error) {
      if (!(error instanceof GoogleAccessRevokedError)) {
        throw error;
      }
    }
  }
}
