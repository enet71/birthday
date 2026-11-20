import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

// A birthday a guest sent through `user_id`'s invite link, waiting for the user to add or reject it. It belongs to the
// user rather than the link, so reissuing the link keeps the pending ones.
export const inviteSubmissions = pgTable(
  'invite_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // `yyyy-MM-dd`; the year 0004 marks an unknown birth year.
    birthDate: date('birth_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('invite_submissions_user_id_idx').on(table.userId),
    check('invite_submissions_name_check', sql`length(trim(${table.name})) between 1 and 200`),
  ],
);
