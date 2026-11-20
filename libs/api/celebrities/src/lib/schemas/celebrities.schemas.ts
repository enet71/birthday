import { z } from 'zod';
import {
  APP_LOCALES,
  CELEBRITY_DECADES,
  CELEBRITY_OCCUPATIONS,
  CELEBRITY_SORTS,
  CELEBRITY_STATUSES,
  CelebritiesRequest,
} from '@birthday/shared-models';

// Far more values than any list has, so a request cannot grow without limit.
const LIST_MAX = 50;
// 2000 is a leap year, so February 29 exists.
const REFERENCE_YEAR = 2000;
// The page of a person far down a date; deeper offsets only cost the database.
const OFFSET_MAX = 10000;

// A comma-separated list, for example `occupations=film,music`; an empty value is an empty list.
function list<T extends z.ZodType>(item: T) {
  return z.preprocess(
    (value: unknown) => (value === undefined || value === '' ? [] : typeof value === 'string' ? value.split(',') : value),
    z.array(item).max(LIST_MAX),
  );
}

// Query parameters of `GET /api/celebrities`, as `toCelebritiesQueryParams` builds them. Strict: an unknown parameter is a
// mistake and answers 400.
export const celebritiesRequestSchema = z
  .strictObject({
    month: z.coerce.number().int().min(1).max(12),
    day: z.coerce.number().int().min(1).max(31),
    locale: z.enum(APP_LOCALES).default('en'),
    countries: list(
      z
        .string()
        .regex(/^[a-z]{2}$/i, 'Must be an ISO 3166-1 alpha-2 code')
        .transform((code: string) => code.toUpperCase()),
    ),
    occupations: list(z.enum(CELEBRITY_OCCUPATIONS)),
    decades: list(z.enum(CELEBRITY_DECADES)),
    status: z.enum(CELEBRITY_STATUSES).default('all'),
    sort: z.enum(CELEBRITY_SORTS).default('popularity'),
    offset: z.coerce.number().int().min(0).max(OFFSET_MAX).default(0),
  })
  .refine(({ month, day }) => new Date(REFERENCE_YEAR, month - 1, day).getMonth() === month - 1, {
    message: 'Must be a day that exists in the month',
    path: ['day'],
  })
  .transform(
    ({ countries, occupations, decades, ...rest }): CelebritiesRequest => ({
      ...rest,
      countries: [...new Set(countries)],
      occupations: [...new Set(occupations)],
      decades: [...new Set(decades)],
    }),
  );
