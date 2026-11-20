import { z } from 'zod';
import { CreateInviteSubmissionRequest, SaveInviteLinkRequest } from '@birthday/shared-models';
import { birthDateSchema, birthdayNameSchema } from '@birthday/api-birthdays';

// The same limit as the database check. Lengths count characters as Postgres does, not UTF-16 code units.
const DISPLAY_NAME_MAX = 100;

const displayName = z
  .string()
  .transform((value: string) => value.trim())
  .refine((value: string) => value.length > 0 && [...value].length <= DISPLAY_NAME_MAX, `Must have 1–${DISPLAY_NAME_MAX} characters`);

export const saveInviteLinkSchema = z.strictObject({
  displayName,
  enabled: z.boolean(),
}) satisfies z.ZodType<SaveInviteLinkRequest>;

export const createInviteSubmissionSchema = z.strictObject({
  name: birthdayNameSchema,
  birthDate: birthDateSchema,
  website: z.string().optional(),
}) satisfies z.ZodType<CreateInviteSubmissionRequest>;
