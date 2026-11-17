import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const googleCalendarConnections = pgTable(
  'google_calendar_connections',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['connected', 'revoked', 'disconnected'] }).notNull(),
    connectedAt: timestamp('connected_at', { withTimezone: true }).notNull().defaultNow(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    // These default to `-infinity`, which a JavaScript `Date` cannot hold, so they are read as strings.
    lastPulledAt: timestamp('last_pulled_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`'-infinity'`),
    syncRunningUntil: timestamp('sync_running_until', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`'-infinity'`),
    deletionsCheckedAt: timestamp('deletions_checked_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`'-infinity'`),
  },
  (table) => [check('google_calendar_connections_status_check', sql`${table.status} in ('connected', 'revoked', 'disconnected')`)],
);
