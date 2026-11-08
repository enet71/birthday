import { BirthdayDto } from '@birthday/shared-models';

export type Birthday = BirthdayDto;

export interface UpcomingBirthday {
  birthday: Birthday;
  date: Date;
  daysUntil: number;
}

export type BirthdayTone = 'violet' | 'rose' | 'sky' | 'peach' | 'mint';
