import { AppLocale } from '../i18n';

// Which days a notification mentions: birthdays on the day, the next day's birthdays, or both.
export const REMINDER_DAYS = ['both', 'onDay', 'dayBefore'] as const;

export type ReminderDays = (typeof REMINDER_DAYS)[number];

// Per account; every device with notifications turned on follows them.
export interface ReminderSettingsDto {
  days: ReminderDays;
  // The local hour (0–23) in `timeZone`.
  hour: number;
  // IANA time zone, for example `Europe/Berlin`.
  timeZone: string;
  // The language of the notification texts.
  locale: AppLocale;
}
