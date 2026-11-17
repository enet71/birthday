import { Module } from '@nestjs/common';
import { PushSubscriptionsController, PushSubscriptionsService } from './push-subscriptions';
import { ReminderSettingsController, ReminderSettingsService } from './settings';

@Module({
  controllers: [ReminderSettingsController, PushSubscriptionsController],
  providers: [ReminderSettingsService, PushSubscriptionsService],
})
export class RemindersModule {}
