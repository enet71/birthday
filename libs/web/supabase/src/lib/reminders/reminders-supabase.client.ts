import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DevicePushSubscription, ReminderDays, ReminderSettings, RemindersClient } from '@birthday/web-reminders-data-access';
import { APP_DEFAULT_LOCALE, AppLocale, isAppLocale } from '@birthday/web-shared-i18n';
import { SUPABASE_CLIENT, SupabaseDatabaseClient } from '../client';
import { fromSupabase } from '../helpers';
import { Tables } from '../types';

type SettingsRow = Pick<Tables<'notification_settings'>, 'remind_on_day' | 'remind_day_before' | 'hour' | 'time_zone' | 'locale'>;

const SETTINGS_COLUMNS = 'remind_on_day, remind_day_before, hour, time_zone, locale';

// RLS limits every query to the signed-in user's rows, and the column defaults fill in `user_id`.
@Injectable({ providedIn: 'root' })
export class RemindersSupabaseClient extends RemindersClient {
  private readonly supabase: SupabaseDatabaseClient = inject(SUPABASE_CLIENT);

  public getSettings(): Observable<ReminderSettings | null> {
    return fromSupabase(() => this.supabase.from('notification_settings').select(SETTINGS_COLUMNS).maybeSingle()).pipe(
      map(({ data }) => (data ? this.toSettings(data) : null)),
    );
  }

  // Only `time_zone` and `locale` are sent, so an existing row keeps its days and hour.
  public saveDevicePreferences({ timeZone, locale }: Pick<ReminderSettings, 'timeZone' | 'locale'>): Observable<ReminderSettings> {
    return fromSupabase(() =>
      this.supabase
        .from('notification_settings')
        .upsert({ time_zone: timeZone, locale }, { onConflict: 'user_id' })
        .select(SETTINGS_COLUMNS)
        .single(),
    ).pipe(map(({ data }) => this.toSettings(data)));
  }

  // RLS limits the update to the user's own row; the filter is there because the API refuses an update without one.
  public saveLocale(locale: AppLocale): Observable<void> {
    return fromSupabase(() => this.supabase.from('notification_settings').update({ locale }).not('user_id', 'is', null)).pipe(map(() => undefined));
  }

  public saveSettings(settings: ReminderSettings): Observable<void> {
    return fromSupabase(() =>
      this.supabase.from('notification_settings').upsert(
        {
          remind_on_day: settings.days !== 'dayBefore',
          remind_day_before: settings.days !== 'onDay',
          hour: settings.hour,
          time_zone: settings.timeZone,
          locale: settings.locale,
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
    // The database allows only the app's languages; anything else falls back to the default.
    return { days: this.toDays(row), hour: row.hour, timeZone: row.time_zone, locale: isAppLocale(row.locale) ? row.locale : APP_DEFAULT_LOCALE };
  }

  private toDays({ remind_on_day, remind_day_before }: SettingsRow): ReminderDays {
    if (remind_on_day && remind_day_before) {
      return 'both';
    }

    return remind_on_day ? 'onDay' : 'dayBefore';
  }
}
