import { RelationshipOption } from '../types';

export const NEXT_BIRTHDAYS_LIMIT = 4;

// Birthdays this close are highlighted in the upcoming list.
export const SOON_BIRTHDAY_DAYS = 7;

// Shown as chips in the birthday dialog, in this order; labels are translation keys.
export const RELATIONSHIP_OPTIONS: RelationshipOption[] = [
  { value: 'family', label: 'relationship.family' },
  { value: 'friends', label: 'relationship.friends' },
  { value: 'colleagues', label: 'relationship.colleagues' },
  { value: 'other', label: 'relationship.other' },
];

// Matches the database limit for birthday notes.
export const BIRTHDAY_NOTES_MAX_LENGTH = 500;
