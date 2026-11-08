import { BirthdayRelationship } from '@birthday/shared-models';

// What the user entered for a birthday, before it becomes a storage request.
export interface BirthdayInput {
  name: string;
  date: Date;
  isYearKnown: boolean;
  relationship: BirthdayRelationship | null;
  notes: string;
}
