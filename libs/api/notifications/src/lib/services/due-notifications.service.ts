import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { AppLocale } from '@birthday/shared-models';
import { birthdays, DATABASE, Database, notificationDeliveries, pushSubscriptions } from '@birthday/api-database';
import { DueUser, NotifiedBirthday, StoredPushSubscription } from '../types';

// Deliveries are kept a week: long enough to cover every time zone's "today".
const DELIVERY_RETENTION_DAYS = 7;

interface DueUserRow extends Record<string, unknown> {
  user_id: string;
  local_date: string;
  remind_on_day: boolean;
  remind_day_before: boolean;
  locale: AppLocale;
}

// Who is due for a notification, and what it needs. The API connects as the database owner, so every query filters by
// the user itself.
@Injectable()
export class DueNotificationsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  public async forgetOldDeliveries(): Promise<void> {
    await this.db.delete(notificationDeliveries).where(sql`${notificationDeliveries.localDate} < current_date - ${DELIVERY_RETENTION_DAYS}::int`);
  }

  // Claims up to `limit` due users and returns their settings. A user is due during the chosen local hour and the next
  // one, which catches an hour skipped by a daylight saving change; the window never crosses midnight, so the local
  // date stays the notified day. Only users with a device count. The claim (a row in `notification_deliveries`) comes
  // before sending, so overlapping runs never notify a user twice on one local day. Joining the time zone names skips a
  // stored name the database no longer knows instead of failing for everyone.
  public async claimDueUsers(limit: number): Promise<DueUser[]> {
    const result = await this.db.execute<DueUserRow>(sql`
      with due as (
        select settings.user_id, (now() at time zone settings.time_zone)::date as local_date
        from notification_settings settings
        join pg_catalog.pg_timezone_names zone on zone.name = settings.time_zone
        where extract(hour from now() at time zone settings.time_zone) between settings.hour and least(settings.hour + 1, 23)
          and exists (select 1 from push_subscriptions subscription where subscription.user_id = settings.user_id)
          and not exists (
            select 1
            from notification_deliveries delivery
            where delivery.user_id = settings.user_id and delivery.local_date = (now() at time zone settings.time_zone)::date
          )
        limit ${limit}
      ),
      claimed as (
        insert into notification_deliveries (user_id, local_date)
        select due.user_id, due.local_date from due
        on conflict do nothing
        returning notification_deliveries.user_id, notification_deliveries.local_date
      )
      select claimed.user_id, to_char(claimed.local_date, 'YYYY-MM-DD') as local_date, settings.remind_on_day, settings.remind_day_before, settings.locale
      from claimed
      join notification_settings settings on settings.user_id = claimed.user_id
    `);

    return result.rows.map((row) => ({
      userId: row.user_id,
      localDate: row.local_date,
      remindOnDay: row.remind_on_day,
      remindDayBefore: row.remind_day_before,
      locale: row.locale,
    }));
  }

  // The few birthdays a notification for `localDate` can mention: that day, the next one, and Feb 29, which falls on
  // Feb 28 in other years. `buildBirthdayNotification` picks the exact ones, so a user's whole list is never read.
  public findBirthdaysAround(userId: string, localDate: string): Promise<NotifiedBirthday[]> {
    return this.db
      .select({ name: birthdays.name, birthDate: birthdays.birthDate })
      .from(birthdays)
      .where(
        and(
          eq(birthdays.userId, userId),
          sql`to_char(${birthdays.birthDate}, 'MM-DD') in (to_char(${localDate}::date, 'MM-DD'), to_char(${localDate}::date + 1, 'MM-DD'), '02-29')`,
        ),
      );
  }

  public findSubscriptions(userId: string): Promise<StoredPushSubscription[]> {
    return this.db
      .select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  public async deleteSubscription(id: string): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }
}
