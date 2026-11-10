import { effect, inject, Injectable } from '@angular/core';
import { catchError, EMPTY, map, Observable, switchMap, tap } from 'rxjs';
import { StateController } from '@birthday/web-shared-data-access';
import { Environment, ENVIRONMENT_TOKEN, NotificationsService } from '@birthday/web-shared-util';
import { DevicePushService, RemindersClient } from '../services';
import { DevicePushSubscription, ReminderSettings } from '../types';
import { RemindersState } from './reminders.state';

@Injectable({ providedIn: 'root' })
export class RemindersController extends StateController {
  private readonly remindersState: RemindersState = inject(RemindersState);
  private readonly remindersClient: RemindersClient = inject(RemindersClient);
  private readonly devicePush: DevicePushService = inject(DevicePushService);
  private readonly environment: Environment = inject(ENVIRONMENT_TOKEN);
  private readonly notifications: NotificationsService = inject(NotificationsService);

  constructor() {
    super();
    effect(() => {
      if (this.remindersState.hasLoadError()) {
        this.notifications.createErrorNotification("Couldn't load your notification settings");
      }
    });
  }

  // Reloads on every entry to the screen, which also retries a failed load.
  public reload(): void {
    this.remindersState.settingsResource.reload();
    this.remindersState.deviceSubscriptionResource.reload();
  }

  // The methods below complete without emitting when the request fails.
  // Asks for permission first when the user has not answered yet.
  public enableOnDevice(): Observable<void> {
    return this.devicePush.subscribe(this.environment.vapidPublicKey).pipe(
      tap(() => this.remindersState.permission.set(this.devicePush.getPermission())),
      catchError((error: unknown) => {
        this.remindersState.permission.set(this.devicePush.getPermission());
        // Settings explains how to unblock notifications, and a dismissed request needs nothing; any other failure is unexpected.
        if (this.remindersState.permission() === 'granted') {
          console.error('Subscribing to push notifications failed:', error);
          this.notifications.createErrorNotification("Couldn't turn on notifications");
        }
        return EMPTY;
      }),
      switchMap((subscription: DevicePushSubscription) =>
        this.remindersClient.saveTimeZone(this.getTimeZone()).pipe(
          switchMap((settings: ReminderSettings) => this.remindersClient.saveDeviceSubscription(subscription).pipe(map(() => settings))),
          tap((settings: ReminderSettings) => {
            this.setSettings(settings);
            this.setDeviceSubscription(subscription);
            this.notifications.createSuccessNotification('Notifications turned on');
          }),
          catchError(() => {
            this.notifications.createErrorNotification("Couldn't turn on notifications");
            return EMPTY;
          }),
        ),
      ),
      map(() => undefined),
    );
  }

  // Keeps the browser's subscription, so turning notifications on again reuses it.
  public disableOnDevice(): Observable<void> {
    const subscription: DevicePushSubscription | null = this.remindersState.deviceSubscription();

    if (!subscription) {
      return EMPTY;
    }

    return this.remindersClient.deleteDeviceSubscription(subscription.endpoint).pipe(
      tap(() => {
        this.setDeviceSubscription(null);
        this.notifications.createSuccessNotification('Notifications turned off for this device');
      }),
      catchError(() => {
        this.notifications.createErrorNotification("Couldn't turn off notifications");
        return EMPTY;
      }),
    );
  }

  // Also moves the settings to this browser's time zone, so the hour is the time the user sees.
  public saveSettings(changes: Partial<Pick<ReminderSettings, 'days' | 'hour'>>): Observable<void> {
    const current: ReminderSettings | null = this.remindersState.settings();

    if (!current) {
      return EMPTY;
    }

    const settings: ReminderSettings = { ...current, ...changes, timeZone: this.getTimeZone() };

    return this.remindersClient.saveSettings(settings).pipe(
      tap(() => {
        this.setSettings(settings);
        this.notifications.createSuccessNotification('Notification settings saved');
      }),
      catchError(() => {
        this.notifications.createErrorNotification("Couldn't save the notification settings");
        return EMPTY;
      }),
    );
  }

  // Some browsers report `Etc/Unknown` when the system time zone is not set.
  private getTimeZone(): string {
    const timeZone: string | undefined = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return timeZone && timeZone !== 'Etc/Unknown' ? timeZone : 'UTC';
  }

  private setSettings(settings: ReminderSettings): void {
    const isLoading: boolean = this.remindersState.settingsResource.isLoading();

    this.remindersState.settingsResource.set(settings);
    // `set()` aborts an in-flight load, so load again with the change.
    if (isLoading) {
      this.remindersState.settingsResource.reload();
    }
  }

  private setDeviceSubscription(subscription: DevicePushSubscription | null): void {
    const isLoading: boolean = this.remindersState.deviceSubscriptionResource.isLoading();

    this.remindersState.deviceSubscriptionResource.set(subscription);
    if (isLoading) {
      this.remindersState.deviceSubscriptionResource.reload();
    }
  }
}
