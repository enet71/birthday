import { effect, inject, Injectable, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, map, Observable, Subject, switchMap, tap } from 'rxjs';
import { injectState, ReadonlyState, StateController } from '@birthday/web-shared-data-access';
import { AppLocale, AppTranslateService, LocaleState } from '@birthday/web-shared-i18n';
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
  private readonly translator: AppTranslateService = inject(AppTranslateService);
  private readonly localeState: ReadonlyState<LocaleState> = injectState(LocaleState);
  private readonly localeSaves: Subject<AppLocale> = new Subject<AppLocale>();

  constructor() {
    super();
    effect(() => {
      if (this.remindersState.hasLoadError()) {
        // Untracked, so a language switch does not show the error again.
        untracked(() => this.notifications.createErrorNotification(this.translator.translate('notifications.reminders.loadFailed')));
      }
    });

    // Notifications come in the app's language: the reminder settings load on the Settings page, so a language switch
    // there, or opening Settings in another language, updates the stored one.
    effect(() => {
      const locale: AppLocale = this.localeState.locale();
      const settings: ReminderSettings | null = this.remindersState.settings();

      if (settings && settings.locale !== locale) {
        untracked(() => this.localeSaves.next(locale));
      }
    });

    // A background update, so a failure stays silent and the next switch tries again. `switchMap` keeps only the latest
    // language, and the result patches the current settings, so a save made meanwhile is not undone.
    this.localeSaves
      .pipe(
        switchMap((locale: AppLocale) =>
          this.remindersClient.saveLocale(locale).pipe(
            map(() => locale),
            catchError(() => EMPTY),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((locale: AppLocale) => {
        const current: ReminderSettings | null = this.remindersState.settings();

        if (current) {
          this.setSettings({ ...current, locale });
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
          this.notifications.createErrorNotification(this.translator.translate('notifications.reminders.turnOnFailed'));
        }
        return EMPTY;
      }),
      switchMap((subscription: DevicePushSubscription) =>
        this.remindersClient.saveDevicePreferences({ timeZone: this.getTimeZone(), locale: this.localeState.locale() }).pipe(
          switchMap((settings: ReminderSettings) => this.remindersClient.saveDeviceSubscription(subscription).pipe(map(() => settings))),
          tap((settings: ReminderSettings) => {
            this.setSettings(settings);
            this.setDeviceSubscription(subscription);
            this.notifications.createSuccessNotification(this.translator.translate('notifications.reminders.turnedOn'));
          }),
          catchError(() => {
            this.notifications.createErrorNotification(this.translator.translate('notifications.reminders.turnOnFailed'));
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
        this.notifications.createSuccessNotification(this.translator.translate('notifications.reminders.turnedOff'));
      }),
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.reminders.turnOffFailed'));
        return EMPTY;
      }),
    );
  }

  // Also moves the settings to this browser's time zone and the app's language, so the hour is the time the user sees.
  public saveSettings(changes: Partial<Pick<ReminderSettings, 'days' | 'hour'>>): Observable<void> {
    const current: ReminderSettings | null = this.remindersState.settings();

    if (!current) {
      return EMPTY;
    }

    const settings: ReminderSettings = { ...current, ...changes, timeZone: this.getTimeZone(), locale: this.localeState.locale() };

    return this.remindersClient.saveSettings(settings).pipe(
      tap(() => {
        this.setSettings(settings);
        this.notifications.createSuccessNotification(this.translator.translate('notifications.reminders.saved'));
      }),
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.reminders.saveFailed'));
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
