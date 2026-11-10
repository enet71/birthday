import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DevicePushSubscription, ReminderDays, ReminderSettings, RemindersClient } from '@birthday/web-reminders-data-access';
import { SUPABASE_CLIENT, SupabaseDatabaseClient } from '../client';
import { fromSupabase } from '../helpers';
import { Tables } from '../types';

type SettingsRow = Pick<Tables<'notification_settings'>, 'remind_on_day' | 'remind_day_before' | 'hour' | 'time_zone'>;

const SETTINGS_COLUMNS = 'remind_on_day, remind_day_before, hour, time_zone';

// RLS limits every query to the signed-in user's rows, and the column defaults fill in `user_id`.
@Injectable({ providedIn: 'root' })
export class RemindersSupabaseClient extends RemindersClient {
  private readonly supabase: SupabaseDatabaseClient = inject(SUPABASE_CLIENT);

  public getSettings(): Observable<ReminderSettings | null> {
    return fromSupabase(() => this.supabase.from('notification_settings').select(SETTINGS_COLUMNS).maybeSingle()).pipe(
      map(({ data }) => (data ? this.toSettings(data) : null)),
    );
  }

  // Only `time_zone` is sent, so an existing row keeps its days and hour.
  public saveTimeZone(timeZone: string): Observable<ReminderSettings> {
    return fromSupabase(() =>
      this.supabase.from('notification_settings').upsert({ time_zone: timeZone }, { onConflict: 'user_id' }).select(SETTINGS_COLUMNS).single(),
    ).pipe(map(({ data }) => this.toSettings(data)));
  }

  public saveSettings(settings: ReminderSettings): Observable<void> {
    return fromSupabase(() =>
      this.supabase.from('notification_settings').upsert(
        {
          remind_on_day: settings.days !== 'dayBefore',
          remind_day_before: settings.days !== 'onDay',
          hour: settings.hour,
          time_zone: settings.timeZone,
        },
        { onConflict: 'user_id' },
      ),
    ).pipe(map(() => undefined));
  }

  public hasDeviceSubscription(endpoint: string): Observable<boolean> {
    return fromSupabase(() => this.supabase.from('push_subscriptions').select('id').eq('endpoint', endpoint).maybeSingle()).pipe(
      map(({ data }) => data !== null),
    );
  }

  // The browser may renew the keys of an endpoint; the upsert stores the current ones.
  public saveDeviceSubscription(subscription: DevicePushSubscription): Observable<void> {
    return fromSupabase(() =>
      this.supabase
        .from('push_subscriptions')
        .upsert({ endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth }, { onConflict: 'user_id,endpoint' }),
    ).pipe(map(() => undefined));
  }

  public deleteDeviceSubscription(endpoint: string): Observable<void> {
    return fromSupabase(() => this.supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)).pipe(map(() => undefined));
  }

  private toSettings(row: SettingsRow): ReminderSettings {
    return { days: this.toDays(row), hour: row.hour, timeZone: row.time_zone };
  }

  private toDays({ remind_on_day, remind_day_before }: SettingsRow): ReminderDays {
    if (remind_on_day && remind_day_before) {
      return 'both';
    }

    return remind_on_day ? 'onDay' : 'dayBefore';
  }
}
