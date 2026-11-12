import { ReminderDayOption, ReminderHourOption } from '../types';

export const REMINDER_DAY_OPTIONS: ReminderDayOption[] = [
  { days: 'both', label: 'reminders.days.both' },
  { days: 'onDay', label: 'reminders.days.onDay' },
  { days: 'dayBefore', label: 'reminders.days.dayBefore' },
];

export const REMINDER_HOUR_OPTIONS: ReminderHourOption[] = Array.from({ length: 24 }, (_: unknown, hour: number) => ({
  hour,
  time: new Date(2000, 0, 1, hour),
}));
