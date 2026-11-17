import { date, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

// One row per user and local date that was notified; it keeps a user from being notified twice a day.
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    localDate: date('local_date').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.localDate] })],
);
