import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AuthClient } from '@birthday/web-auth-data-access';
import { BirthdaysRemoteStorage } from '@birthday/web-birthdays-data-access';
import { APP_LAYOUT_CONFIG } from '@birthday/web-layout-util';
import { ENVIRONMENT_TOKEN } from '@birthday/web-shared-util';
import { BirthdaysSupabaseService, provideSupabase, SupabaseAuthClient } from '@birthday/web-supabase';
import { appRoutes } from './app.routes';
import { APP_LAYOUT } from './app.constants';
import { AppPageMetaStrategy } from './app-page-meta.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    { provide: TitleStrategy, useClass: AppPageMetaStrategy },
    provideHttpClient(withFetch()),
    provideSupabase(),
    // Swap these implementations to move auth and account data to another backend, for example the NestJS API.
    { provide: AuthClient, useExisting: SupabaseAuthClient },
    { provide: BirthdaysRemoteStorage, useExisting: BirthdaysSupabaseService },
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
        notificationErrorTime: 5000,
        notificationSuccessTime: 3000,
      },
    },
  ],
};
