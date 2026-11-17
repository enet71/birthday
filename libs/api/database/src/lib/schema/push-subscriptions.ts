import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('push_subscriptions_user_id_endpoint_key').on(table.userId, table.endpoint),
    check(
      'push_subscriptions_endpoint_check',
      sql`length(${table.endpoint}) <= 2048 and ${table.endpoint} ~ '^https://([a-z0-9-]+\\.)*(fcm\\.googleapis\\.com|push\\.services\\.mozilla\\.com|notify\\.windows\\.com|push\\.apple\\.com)/'`,
    ),
    check('push_subscriptions_p256dh_check', sql`length(${table.p256dh}) between 1 and 256`),
    check('push_subscriptions_auth_check', sql`length(${table.auth}) between 1 and 256`),
  ],
);
