import type { Mock } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AuthClient } from '@birthday/web-auth-data-access';
import { AppLocale, AppTranslateService, LocaleState } from '@birthday/web-shared-i18n';
import { Environment, ENVIRONMENT_TOKEN, NotificationsService, PlatformService } from '@birthday/web-shared-util';
import { DevicePushService, RemindersClient } from '../services';
import { DevicePushSubscription, ReminderSettings } from '../types';
import { RemindersController } from './reminders.controller';
import { RemindersState } from './reminders.state';

const SETTINGS: ReminderSettings = { days: 'both', hour: 9, timeZone: 'Europe/Berlin', locale: 'en' };
const SUBSCRIPTION: DevicePushSubscription = { endpoint: 'https://push.test/1', p256dh: 'key', auth: 'secret' };

describe('RemindersController', () => {
  let controller: RemindersController;
  let state: RemindersState;
  let localeState: LocaleState;
  const remindersClient: {
    saveLocale: Mock<RemindersClient['saveLocale']>;
    saveSettings: Mock<RemindersClient['saveSettings']>;
    saveDevicePreferences: Mock<RemindersClient['saveDevicePreferences']>;
    saveDeviceSubscription: Mock<RemindersClient['saveDeviceSubscription']>;
  } = {
    saveLocale: vi.fn(),
    saveSettings: vi.fn(),
    saveDevicePreferences: vi.fn(),
    saveDeviceSubscription: vi.fn(),
  };
  const devicePush: {
    subscribe: Mock<DevicePushService['subscribe']>;
    getPermission: Mock<DevicePushService['getPermission']>;
    getSupport: Mock<DevicePushService['getSupport']>;
  } = {
    subscribe: vi.fn(),
    getPermission: vi.fn(),
    getSupport: vi.fn(),
  };
  const notifications: {
    createErrorNotification: Mock<NotificationsService['createErrorNotification']>;
    createSuccessNotification: Mock<NotificationsService['createSuccessNotification']>;
  } = {
    createErrorNotification: vi.fn(),
    createSuccessNotification: vi.fn(),
  };

  // Settings the user already has, as if they had loaded.
  function loadSettings(settings: ReminderSettings): void {
    state.settingsResource.set(settings);
    TestBed.tick();
  }

  function switchLocale(locale: AppLocale): void {
    localeState.locale.set(locale);
    TestBed.tick();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    remindersClient.saveLocale.mockReturnValue(of(undefined));
    remindersClient.saveSettings.mockReturnValue(of(undefined));
    devicePush.getPermission.mockReturnValue('granted');
    devicePush.getSupport.mockReturnValue('unsupported');

    TestBed.configureTestingModule({
      providers: [
        // Signed out, so the State does not load anything by itself.
        { provide: AuthClient, useValue: { userChanges: (): Observable<null> => of(null) } },
        { provide: RemindersClient, useValue: remindersClient },
        { provide: DevicePushService, useValue: devicePush },
        { provide: NotificationsService, useValue: notifications },
        { provide: PlatformService, useValue: { isRendered: signal(false) } },
        { provide: ENVIRONMENT_TOKEN, useValue: { vapidPublicKey: 'vapid-key' } as Environment },
        { provide: AppTranslateService, useValue: { translate: (key: string): string => key } },
      ],
    });

    controller = TestBed.inject(RemindersController);
    state = TestBed.inject(RemindersState);
    localeState = TestBed.inject(LocaleState);
    TestBed.tick();
  });

  describe('locale sync', () => {
    it('does not save the language when the stored one matches the app language', () => {
      loadSettings(SETTINGS);

      expect(remindersClient.saveLocale).not.toHaveBeenCalled();
    });

    it('does not save the language without settings', () => {
      switchLocale('de');

      expect(remindersClient.saveLocale).not.toHaveBeenCalled();
    });

    it('saves the app language when the loaded settings hold another one', () => {
      loadSettings({ ...SETTINGS, locale: 'ru' });

      expect(remindersClient.saveLocale).toHaveBeenCalledWith('en');
      expect(state.settings()).toEqual(SETTINGS);
    });

    it('saves the new language after a switch and keeps the other settings', () => {
      loadSettings(SETTINGS);

      switchLocale('de');

      expect(remindersClient.saveLocale).toHaveBeenCalledExactlyOnceWith('de');
      expect(state.settings()).toEqual({ ...SETTINGS, locale: 'de' });
    });

    it('stays silent and keeps the stored language when the save fails', () => {
      remindersClient.saveLocale.mockReturnValue(throwError(() => new Error('offline')));
      loadSettings(SETTINGS);

      switchLocale('de');

      expect(state.settings()).toEqual(SETTINGS);
      expect(notifications.createErrorNotification).not.toHaveBeenCalled();
    });

    it('tries again on the next switch after a failed save', () => {
      remindersClient.saveLocale.mockReturnValueOnce(throwError(() => new Error('offline')));
      loadSettings(SETTINGS);
      switchLocale('de');

      switchLocale('fr');

      expect(remindersClient.saveLocale).toHaveBeenLastCalledWith('fr');
      expect(state.settings()).toEqual({ ...SETTINGS, locale: 'fr' });
    });

    it('keeps only the latest language when saves overlap', () => {
      const deSave: Subject<void> = new Subject<void>();
      remindersClient.saveLocale.mockImplementation((locale: AppLocale) => (locale === 'de' ? deSave : of(undefined)));
      loadSettings(SETTINGS);

      switchLocale('de');
      switchLocale('fr');
      deSave.next();

      expect(state.settings()).toEqual({ ...SETTINGS, locale: 'fr' });
    });

    it('patches the current settings, so a settings save made meanwhile is not undone', () => {
      const localeSave: Subject<void> = new Subject<void>();
      remindersClient.saveLocale.mockReturnValue(localeSave);
      loadSettings(SETTINGS);
      switchLocale('de');

      controller.saveSettings({ hour: 20 }).subscribe();
      localeSave.next();

      expect(state.settings()).toEqual({ ...SETTINGS, hour: 20, timeZone: expect.any(String), locale: 'de' });
    });
  });

  describe('saveSettings', () => {
    it('saves the settings in the app language', () => {
      loadSettings(SETTINGS);
      localeState.locale.set('uk');

      controller.saveSettings({ days: 'onDay' }).subscribe();

      expect(remindersClient.saveSettings).toHaveBeenCalledWith({ ...SETTINGS, days: 'onDay', timeZone: expect.any(String), locale: 'uk' });
      expect(state.settings()).toEqual({ ...SETTINGS, days: 'onDay', timeZone: expect.any(String), locale: 'uk' });
    });
  });

  describe('enableOnDevice', () => {
    it('saves the app language with the device preferences', () => {
      const stored: ReminderSettings = { ...SETTINGS, locale: 'es' };
      devicePush.subscribe.mockReturnValue(of(SUBSCRIPTION));
      remindersClient.saveDevicePreferences.mockReturnValue(of(stored));
      remindersClient.saveDeviceSubscription.mockReturnValue(of(undefined));
      localeState.locale.set('es');

      controller.enableOnDevice().subscribe();

      expect(remindersClient.saveDevicePreferences).toHaveBeenCalledWith({ timeZone: expect.any(String), locale: 'es' });
      expect(state.settings()).toEqual(stored);
    });
  });
});
