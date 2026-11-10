// Which days a notification mentions: birthdays on the day, the next day's birthdays, or both.
export type ReminderDays = 'both' | 'onDay' | 'dayBefore';

// Per account; every device with notifications turned on follows them.
export interface ReminderSettings {
  days: ReminderDays;
  // The local hour (0–23) in `timeZone`.
  hour: number;
  // IANA time zone, for example `Europe/Berlin`.
  timeZone: string;
}

// The push subscription the browser created for this device.
export interface DevicePushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// `iosNotInstalled`: Safari on iPhone and iPad shows notifications only for sites added to the Home Screen.
export type PushSupport = 'supported' | 'unsupported' | 'iosNotInstalled';
