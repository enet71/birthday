import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const birthdays = pgTable(
  'birthdays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // `yyyy-MM-dd`; the year 0004 marks an unknown birth year.
    birthDate: date('birth_date').notNull(),
    relationship: text('relationship', { enum: ['family', 'friends', 'colleagues', 'other'] }),
    notes: text('notes'),
    googleContactId: text('google_contact_id'),
    googleContactSnapshot: text('google_contact_snapshot'),
    googleEventId: text('google_event_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // Drizzle sets it to the database time on every update through the schema, unless the update sets it itself; raw
    // SQL must set it. The Google sync compares it with the time of changes in Google.
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [
    index('birthdays_user_id_idx').on(table.userId),
    uniqueIndex('birthdays_user_id_google_contact_id_idx').on(table.userId, table.googleContactId),
    index('birthdays_google_event_id_idx')
      .on(table.googleEventId)
      .where(sql`${table.googleEventId} is not null`),
    check('birthdays_name_check', sql`length(trim(${table.name})) between 1 and 200`),
    check('birthdays_relationship_check', sql`${table.relationship} in ('family', 'friends', 'colleagues', 'other')`),
    check('birthdays_notes_check', sql`length(${table.notes}) <= 500`),
  ],
);
