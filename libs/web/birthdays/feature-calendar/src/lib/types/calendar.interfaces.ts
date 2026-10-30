import { Birthday, UpcomingBirthday } from '@birthday/web-birthdays-util';

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
  // 1–12.
  month: number;
  day: number;
  // Empty when the birth year is unknown.
  year: string;
}

export type CalendarView = 'month' | 'year';

export type BirthdayTone = 'violet' | 'rose' | 'sky' | 'peach' | 'mint';

export interface UpcomingCelebration extends UpcomingBirthday {
  age: number | null;
}
