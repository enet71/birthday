import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notificationSettings = pgTable(
  'notification_settings',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    remindOnDay: boolean('remind_on_day').notNull().default(true),
    remindDayBefore: boolean('remind_day_before').notNull().default(true),
    // The user's local hour, 0–23.
    hour: smallint('hour').notNull().default(9),
    timeZone: text('time_zone').notNull(),
    locale: text('locale', { enum: ['en', 'es', 'de', 'fr', 'ru', 'uk'] })
      .notNull()
      .default('en'),
  },
  (table) => [
    check('notification_settings_hour_check', sql`${table.hour} between 0 and 23`),
    check('notification_settings_time_zone_check', sql`public.is_valid_time_zone(${table.timeZone})`),
    check('notification_settings_check', sql`${table.remindOnDay} or ${table.remindDayBefore}`),
    check('notification_settings_locale_check', sql`${table.locale} in ('en', 'es', 'de', 'fr', 'ru', 'uk')`),
  ],
);
