import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  AppLocale,
  PushSubscriptionEndpointRequest,
  PushSubscriptionLookupResponse,
  ReminderDevicePreferencesRequest,
  ReminderLocaleRequest,
} from '@birthday/shared-models';
import { ApiService } from '@birthday/web-shared-data-access';
import { DevicePushSubscription, ReminderSettings } from '../types';
import { RemindersClient } from './reminders.client';

// Birthday notification settings and this device's push subscription through the API. The subscription endpoint
// travels only in request bodies: it addresses the device, so it must not end up in URLs and logs.
@Injectable({ providedIn: 'root' })
export class RemindersApiService extends ApiService implements RemindersClient {
  private readonly settingsUrl = `${this.baseUrl}/reminders/settings`;
  private readonly subscriptionsUrl = `${this.baseUrl}/push-subscriptions`;

  public getSettings(): Observable<ReminderSettings | null> {
    return this.httpClient.get<ReminderSettings | null>(this.settingsUrl).pipe(map((settings) => settings ?? null));
  }

  public saveDevicePreferences(preferences: Pick<ReminderSettings, 'timeZone' | 'locale'>): Observable<ReminderSettings> {
    const body: ReminderDevicePreferencesRequest = { timeZone: preferences.timeZone, locale: preferences.locale };

    return this.httpClient.put<ReminderSettings>(`${this.settingsUrl}/device`, body);
  }

  public saveLocale(locale: AppLocale): Observable<void> {
    const body: ReminderLocaleRequest = { locale };

    return this.httpClient.patch<void>(`${this.settingsUrl}/locale`, body);
  }

  public saveSettings(settings: ReminderSettings): Observable<void> {
    return this.httpClient.put<ReminderSettings>(this.settingsUrl, settings).pipe(map(() => undefined));
  }

  public hasDeviceSubscription(endpoint: string): Observable<boolean> {
    const body: PushSubscriptionEndpointRequest = { endpoint };

    return this.httpClient
      .post<PushSubscriptionLookupResponse>(`${this.subscriptionsUrl}/lookup`, body)
      .pipe(map((response: PushSubscriptionLookupResponse) => response.exists));
  }

  public saveDeviceSubscription(subscription: DevicePushSubscription): Observable<void> {
    return this.httpClient.put<void>(this.subscriptionsUrl, subscription);
  }

  public deleteDeviceSubscription(endpoint: string): Observable<void> {
    const body: PushSubscriptionEndpointRequest = { endpoint };

    return this.httpClient.delete<void>(this.subscriptionsUrl, { body });
  }
}
