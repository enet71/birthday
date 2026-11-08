export const BIRTHDAY_RELATIONSHIPS = ['family', 'friends', 'colleagues', 'other'] as const;

export type BirthdayRelationship = (typeof BIRTHDAY_RELATIONSHIPS)[number];

export interface BirthdayDto {
  id: string;
  name: string;
  // Birth date in the `yyyy-MM-dd` format.
  birthDate: string;
  relationship: BirthdayRelationship | null;
  notes: string | null;
}
