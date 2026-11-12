import { Observable } from 'rxjs';
import { AppLocale } from '@birthday/web-shared-i18n';
import { DevicePushSubscription, ReminderSettings } from '../types';

// The backend of birthday notifications. The app config picks the implementation.
export abstract class RemindersClient {
  // Emits `null` when the user has never turned notifications on.
  public abstract getSettings(): Observable<ReminderSettings | null>;

  // Creates the settings with the default days and hour when there are none, and keeps them otherwise; either way
  // stores this device's `timeZone` and `locale`. Emits the stored settings.
  public abstract saveDevicePreferences(preferences: Pick<ReminderSettings, 'timeZone' | 'locale'>): Observable<ReminderSettings>;

  // Changes only the language of existing settings.
  public abstract saveLocale(locale: AppLocale): Observable<void>;

  public abstract saveSettings(settings: ReminderSettings): Observable<void>;

  // Whether the signed-in user gets notifications at `endpoint`.
  public abstract hasDeviceSubscription(endpoint: string): Observable<boolean>;

  public abstract saveDeviceSubscription(subscription: DevicePushSubscription): Observable<void>;

  public abstract deleteDeviceSubscription(endpoint: string): Observable<void>;
}
