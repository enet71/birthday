import { Birthday } from '@birthday/web-birthdays-util';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  birthdays: Birthday[];
}

export interface AddBirthdayDialogData {
  date: Date;
}

export interface AddBirthdayFormModel {
  name: string;
  date: Date;
}

export type BirthdayTone = 'primary' | 'secondary' | 'tertiary' | 'error';
