import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideRouter, TitleStrategy, withAutoCleanupInjectors } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { AuthClient } from '@birthday/web-auth-data-access';
import { BirthdaysRemoteStorage } from '@birthday/web-birthdays-data-access';
import { GoogleCalendarClient } from '@birthday/web-google-calendar-data-access';
import { APP_LAYOUT_CONFIG } from '@birthday/web-layout-util';
import { provideReminders, RemindersClient } from '@birthday/web-reminders-data-access';
import { provideI18n } from '@birthday/web-shared-i18n';
import { ENVIRONMENT_TOKEN } from '@birthday/web-shared-util';
import {
  BirthdaysSupabaseService,
  GoogleCalendarSupabaseClient,
  provideSupabase,
  RemindersSupabaseClient,
  SupabaseAuthClient,
} from '@birthday/web-supabase';
import { loadAppTranslation } from './app.i18n';
import { appRoutes } from './app.routes';
import { APP_LAYOUT } from './app.constants';
import { AppPageMetaStrategy } from './app-page-meta.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    // Destroys route injectors when their route is left, so route-provided State and Controllers do not outlive the page.
    provideRouter(appRoutes, withAutoCleanupInjectors()),
    { provide: TitleStrategy, useClass: AppPageMetaStrategy },
    provideHttpClient(withFetch()),
    provideSupabase(),
    provideI18n({ loadTranslation: loadAppTranslation }),
    // Shows birthday push notifications. It caches no files (see `ngsw-config.json`), so every page comes from the network.
    provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:5000' }),
    provideReminders(),
    // Swap these implementations to move auth and account data to another backend, for example the NestJS API.
    { provide: AuthClient, useExisting: SupabaseAuthClient },
    { provide: BirthdaysRemoteStorage, useExisting: BirthdaysSupabaseService },
    { provide: GoogleCalendarClient, useExisting: GoogleCalendarSupabaseClient },
    { provide: RemindersClient, useExisting: RemindersSupabaseClient },
    {
      provide: MAT_ICON_DEFAULT_OPTIONS,
      useValue: { fontSet: 'material-symbols-outlined' },
    },
    { provide: APP_LAYOUT_CONFIG, useValue: APP_LAYOUT },
    {
      provide: ENVIRONMENT_TOKEN,
      useValue: {
        environmentName: isDevMode() ? 'local' : 'production',
        version: '0.0.0',
        baseUrl: '',
        supabaseUrl: 'https://wpnrneoqvxddhbltmysx.supabase.co',
        // Publishable keys are meant for the browser; data access is enforced by RLS.
        supabasePublishableKey: 'sb_publishable_4F1HdGrn9YerAJwVArdDvA_RXDVJvWB',
        // Pairs with the private key in the `VAPID_KEYS` Edge Function secret.
        vapidPublicKey: 'BOV_Vh3KueF0knJwOQk6i7dl-7mtB6-VpzP5UccpfDO8tY5tEf6yHLSDfcirUzV6rYhJrSeX69v-DcpCfnD83LE',
        notificationErrorTime: 5000,
        notificationSuccessTime: 3000,
      },
    },
  ],
};
