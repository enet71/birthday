import { BirthdayRelationship, InviteSubmissionDto } from '@birthday/shared-models';
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
  // The age on the next birthday, `null` when the birth year is unknown.
  turningAge: number | null;
}

export type PeopleSortColumn = 'name' | 'relationship' | 'birthday' | 'nextBirthday';

// `none` keeps only people without a relationship.
export type RelationshipFilter = 'all' | 'none' | BirthdayRelationship;

export interface InviteSubmissionRow {
  submission: InviteSubmissionDto;
  // Parsed in the local time zone, so it shows the sent day.
  birthDate: Date;
  hasBirthYear: boolean;
  // An add or reject of it is in flight.
  isPending: boolean;
}

export interface InviteLinkFormModel {
  displayName: string;
}

// `gone`: the submission was already added or rejected elsewhere.
export type SubmissionChangeResult = 'done' | 'gone' | 'failed';
