import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job, PgBoss } from 'pg-boss';
import { BirthdayChange } from '@birthday/api-birthdays';
import { PG_BOSS } from '@birthday/api-jobs';
import { FIRST_SYNC_QUEUE, PUSH_QUEUE } from '../constants';
import { GoogleAccessRevokedError } from '../errors';
import { FirstSyncJob } from '../types';
import { GoogleCalendarEventsService } from './google-calendar-events.service';
import { GoogleConnectionsService } from './google-connections.service';
import { GoogleImportService } from './google-import.service';

// A push retries for about half an hour with growing pauses (10 s, 20 s, 40 s, ...), which outlasts a short Google or
// network outage. The first sync can take minutes for a large account.
const PUSH_QUEUE_OPTIONS = { retryLimit: 6, retryDelay: 10, retryBackoff: true, expireInSeconds: 2 * 60 };
const FIRST_SYNC_QUEUE_OPTIONS = { retryLimit: 3, retryDelay: 60, retryBackoff: true, expireInSeconds: 15 * 60 };

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
    await this.boss.createQueue(PUSH_QUEUE, PUSH_QUEUE_OPTIONS);
    await this.boss.updateQueue(PUSH_QUEUE, PUSH_QUEUE_OPTIONS);
    await this.boss.createQueue(FIRST_SYNC_QUEUE, FIRST_SYNC_QUEUE_OPTIONS);
    await this.boss.updateQueue(FIRST_SYNC_QUEUE, FIRST_SYNC_QUEUE_OPTIONS);
    // Several jobs at once, so one user's slow Google requests do not hold back everyone else's.
    await this.boss.work<BirthdayChange>(PUSH_QUEUE, { localConcurrency: 5 }, ([job]: Job<BirthdayChange>[]) => this.push(job.data));
    await this.boss.work<FirstSyncJob>(FIRST_SYNC_QUEUE, { localConcurrency: 2 }, ([job]: Job<FirstSyncJob>[]) => this.runFirstSync(job.data));
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

  // Imports from Google and exports every birthday right after connecting.
  private async runFirstSync({ userId }: FirstSyncJob): Promise<void> {
    try {
      const summary = await this.importService.runSync(userId, { minIntervalMs: 0, reconcile: true });

      if (!summary) {
        this.logger.warn('The first Google sync was skipped because another sync of the user is running; "Sync now" repeats it');
      }
    } catch (error) {
      if (!(error instanceof GoogleAccessRevokedError)) {
        throw error;
      }
    }
  }
}
