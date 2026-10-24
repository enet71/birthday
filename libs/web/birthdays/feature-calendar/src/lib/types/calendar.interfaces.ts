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

export interface AddBirthdayDialogData {
  date: Date;
}

export interface AddBirthdayFormModel {
  name: string;
  date: Date;
}

export type CalendarView = 'month' | 'year';

export type BirthdayTone = 'primary' | 'secondary' | 'tertiary' | 'error';
