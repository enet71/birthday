import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

// A user's link for guests to send their birthdays. One per user; reissuing replaces the token, so the old link stops
// working. The token is stored as is: the owner must be able to see the link again, and it only lets guests send a
// birthday for moderation.
export const inviteLinks = pgTable(
  'invite_links',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    displayName: text('display_name').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => [check('invite_links_display_name_check', sql`length(trim(${table.displayName})) between 1 and 100`)],
);
