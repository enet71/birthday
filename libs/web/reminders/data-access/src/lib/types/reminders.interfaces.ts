import { DevicePushSubscriptionDto, ReminderDays, ReminderSettingsDto } from '@birthday/shared-models';

// The API contract types under the names the web app uses.
export type { ReminderDays };
export type ReminderSettings = ReminderSettingsDto;
export type DevicePushSubscription = DevicePushSubscriptionDto;

// `iosNotInstalled`: Safari on iPhone and iPad shows notifications only for sites added to the Home Screen.
export type PushSupport = 'supported' | 'unsupported' | 'iosNotInstalled';
