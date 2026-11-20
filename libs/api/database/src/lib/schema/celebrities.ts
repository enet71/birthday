import { sql } from 'drizzle-orm';
import { check, date, index, integer, jsonb, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';

// Labels or article titles per language code (`en`, `ru`, ..., `mul` for the label shared by every language).
export type CelebrityTexts = Record<string, string>;

// Famous people imported from Wikidata; see libs/api/celebrities.
export const celebrities = pgTable(
  'celebrities',
  {
    // Wikidata item id, for example `Q42`.
    id: text('id').primaryKey(),
    // `yyyy-MM-dd`; only day-precise birth dates are imported.
    birthDate: date('birth_date').notNull(),
    // Copies of the birth date's month and day, for the date pages' index.
    birthMonth: smallint('birth_month').notNull(),
    birthDay: smallint('birth_day').notNull(),
    // `yyyy-MM-dd`; January 1 when Wikidata knows only the year.
    deathDate: date('death_date'),
    // One of `CELEBRITY_OCCUPATIONS`; `null` until the details are loaded.
    occupation: text('occupation'),
    // ISO 3166-1 alpha-2 codes of every citizenship.
    countries: text('countries').array().notNull(),
    // Keys of the segments whose query found the person (`US-film`, ...); the person is removed when none does.
    segments: text('segments').array().notNull().default([]),
    names: jsonb('names').$type<CelebrityTexts>().notNull().default({}),
    // Wikipedia article titles per language code.
    wikipediaTitles: jsonb('wikipedia_titles').$type<CelebrityTexts>().notNull().default({}),
    // The number of Wikimedia sites with an article about the person.
    sitelinks: integer('sitelinks').notNull(),
    // Views of the English article in the last 12 full months; `null` without an English article or before they load.
    pageviews: integer('pageviews'),
    detailsLoadedAt: timestamp('details_loaded_at', { withTimezone: true }),
    pageviewsLoadedAt: timestamp('pageviews_loaded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    index('celebrities_birth_month_day_idx').on(table.birthMonth, table.birthDay),
    check('celebrities_birth_month_check', sql`${table.birthMonth} between 1 and 12`),
    check('celebrities_birth_day_check', sql`${table.birthDay} between 1 and 31`),
  ],
);

// The last import of every segment (`US-film`, ...); a segment without a row was never imported.
export const celebrityImports = pgTable('celebrity_imports', {
  segment: text('segment').primaryKey(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  // When the list of the segment's people was saved; their details and page views load afterwards in other jobs.
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  people: integer('people'),
  error: text('error'),
});
