import { Global, Module } from '@nestjs/common';
import { InviteSubmissionsListener } from '@birthday/api-invites';
import { ConfigurableModuleClass } from './notifications.module-definition';
import {
  BirthdayNotificationsService,
  DueNotificationsService,
  InviteSubmissionNotificationsService,
  NotificationsJobsService,
  PushSenderService,
  UserPushService,
} from './services';

// Global, so `InvitesModule` receives the `InviteSubmissionsListener` that notifies the link owner without importing
// this module.
@Global()
@Module({
  providers: [
    PushSenderService,
    DueNotificationsService,
    UserPushService,
    BirthdayNotificationsService,
    NotificationsJobsService,
    InviteSubmissionNotificationsService,
    { provide: InviteSubmissionsListener, useExisting: InviteSubmissionNotificationsService },
  ],
  exports: [InviteSubmissionsListener],
})
export class NotificationsModule extends ConfigurableModuleClass {}
