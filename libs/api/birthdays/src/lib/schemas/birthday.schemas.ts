import { z } from 'zod';
import { BIRTHDAY_RELATIONSHIPS, CreateBirthdayRequest, UpdateBirthdayRequest } from '@birthday/shared-models';

// The same limits as the database checks. Lengths count characters as Postgres does, not UTF-16 code units.
const NAME_MAX = 200;
const NOTES_MAX = 500;

const name = z
  .string()
  .transform((value: string) => value.trim())
  .refine((value: string) => value.length > 0 && [...value].length <= NAME_MAX, `Must have 1–${NAME_MAX} characters`);

// `yyyy-MM-dd`; the year 0004 marks an unknown birth year, so 0004-02-29 is valid.
const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in the yyyy-MM-dd format')
  .refine(isCalendarDate, 'Must be a date that exists');

const relationship = z.enum(BIRTHDAY_RELATIONSHIPS).nullable();

const notes = z
  .string()
  .refine((value: string) => [...value].length <= NOTES_MAX, `Must have at most ${NOTES_MAX} characters`)
  .nullable();

// Strict: fields the client may not set, such as the Google links, are rejected rather than ignored.
export const createBirthdaySchema = z.strictObject({
  name,
  birthDate,
  relationship: relationship.default(null),
  notes: notes.default(null),
}) satisfies z.ZodType<CreateBirthdayRequest>;

export const updateBirthdaySchema = z
  .strictObject({
    name: name.optional(),
    birthDate: birthDate.optional(),
    relationship: relationship.optional(),
    notes: notes.optional(),
  })
  .refine((changes: object) => Object.keys(changes).length > 0, 'Must change at least one field') satisfies z.ZodType<UpdateBirthdayRequest>;

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);

  // setUTCFullYear, unlike Date.UTC, keeps years below 100 as they are.
  date.setUTCFullYear(year, month - 1, day);
  return year >= 1 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
