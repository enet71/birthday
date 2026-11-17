import { Inject, Injectable, Logger } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { BirthdayChange, BirthdayChangesListener } from '@birthday/api-birthdays';
import { PG_BOSS } from '@birthday/api-jobs';
import { PUSH_QUEUE } from '../constants';
import { GoogleConnectionsService } from './google-connections.service';

// Queues a birthday change for the user's Google Calendar; the `PUSH_QUEUE` worker mirrors it, also after a restart
// and with retries. Changes of users without a connection are not queued.
@Injectable()
export class GoogleCalendarPushQueue extends BirthdayChangesListener {
  private readonly logger = new Logger(GoogleCalendarPushQueue.name);

  constructor(
    @Inject(PG_BOSS) private readonly boss: PgBoss,
    private readonly connections: GoogleConnectionsService,
  ) {
    super();
  }

  // A change that cannot be queued stays missing in Google until the next "Sync now", which reconciles every birthday.
  public async birthdayChanged(change: BirthdayChange): Promise<void> {
    try {
      if (await this.connections.isConnected(change.userId)) {
        await this.boss.send(PUSH_QUEUE, change);
      }
    } catch (error) {
      this.logger.error({ err: error, birthdayId: change.birthdayId }, 'Queueing a birthday change for Google Calendar failed');
    }
  }
}
