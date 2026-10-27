import { Birthday } from '@birthday/web-birthdays-util';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  birthdays: Birthday[];
}

export interface CalendarMonth {
  date: Date;
  days: CalendarDay[];
}

// Opens the dialog in edit mode when `birthday` is set.
export interface BirthdayDialogData {
  date: Date;
  birthday?: Birthday;
}

export interface BirthdayFormModel {
  name: string;
  date: Date;
}

export type CalendarView = 'month' | 'year';

export type BirthdayTone = 'primary' | 'secondary' | 'tertiary' | 'error';
