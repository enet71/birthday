import { ReminderDays, ReminderSettings } from '@birthday/web-reminders-data-access';

// `blocked`: the user blocked notifications for the site. `enabled` and `disabled` describe this device.
export type ReminderSectionView = 'loading' | 'error' | 'unsupported' | 'iosNotInstalled' | 'blocked' | 'disabled' | 'enabled';

export interface ReminderHourOption {
  hour: number;
  // A date at that hour, so the template formats the time for the user's locale.
  time: Date;
}

export interface ReminderDayOption {
  days: ReminderDays;
  label: string;
}

export type ReminderSettingsModel = Pick<ReminderSettings, 'days' | 'hour'>;
