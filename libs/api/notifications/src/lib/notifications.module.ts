import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './notifications.module-definition';
import { BirthdayNotificationsService, DueNotificationsService, NotificationsJobsService, PushSenderService } from './services';

@Module({
  providers: [PushSenderService, DueNotificationsService, BirthdayNotificationsService, NotificationsJobsService],
})
export class NotificationsModule extends ConfigurableModuleClass {}
