import { ReminderDayOption, ReminderHourOption } from '../types';

export const REMINDER_DAY_OPTIONS: ReminderDayOption[] = [
  { days: 'both', label: 'On the day and the day before' },
  { days: 'onDay', label: 'On the day' },
  { days: 'dayBefore', label: 'The day before' },
];

export const REMINDER_HOUR_OPTIONS: ReminderHourOption[] = Array.from({ length: 24 }, (_: unknown, hour: number) => ({
  hour,
  time: new Date(2000, 0, 1, hour),
}));
