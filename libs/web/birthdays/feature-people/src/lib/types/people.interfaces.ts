import { Birthday } from '@birthday/web-birthdays-util';

export interface PersonRow {
  birthday: Birthday;
  // Parsed in the local time zone, so it shows the stored day.
  birthDate: Date;
  hasBirthYear: boolean;
  // `null` when the birth year is unknown.
  age: number | null;
  nextBirthday: Date;
  daysUntil: number;
}

export type PeopleSortColumn = 'name' | 'birthday' | 'age' | 'nextBirthday';
