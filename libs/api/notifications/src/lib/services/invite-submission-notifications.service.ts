import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { AppLocale } from '@birthday/shared-models';
import { DATABASE, Database, notificationSettings } from '@birthday/api-database';
import { CreatedInviteSubmission, InviteSubmissionsListener } from '@birthday/api-invites';
import { buildInviteSubmissionNotification } from '../utils';
import { UserPushService } from './user-push.service';

// Tells the link owner about a new invite submission on every device with notifications on. Users without a device
// get nothing; they see the request on the people page.
@Injectable()
export class InviteSubmissionNotificationsService extends InviteSubmissionsListener {
  private readonly logger = new Logger(InviteSubmissionNotificationsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly userPush: UserPushService,
  ) {
    super();
  }

  public async submissionCreated({ userId, name }: CreatedInviteSubmission): Promise<void> {
    try {
      await this.userPush.pushToUser(userId, buildInviteSubmissionNotification(name, await this.findLocale(userId)));
    } catch (error) {
      this.logger.error({ err: error, userId }, 'Notifying about an invite submission failed');
    }
  }

  private async findLocale(userId: string): Promise<AppLocale> {
    const [settings] = await this.db
      .select({ locale: notificationSettings.locale })
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));

    return settings?.locale ?? 'en';
  }
}
