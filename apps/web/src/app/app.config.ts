import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { provideRouter, TitleStrategy, withAutoCleanupInjectors } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { APP_LAYOUT_CONFIG } from '@birthday/web-layout-util';
import { provideReminders } from '@birthday/web-reminders-data-access';
import { provideI18n } from '@birthday/web-shared-i18n';
import { ENVIRONMENT_TOKEN } from '@birthday/web-shared-util';
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
    provideI18n({ loadTranslation: loadAppTranslation }),
    // Shows birthday push notifications. It caches no files (see `ngsw-config.json`), so every page comes from the network.
    provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:5000' }),
    provideReminders(),
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
        // Pairs with `VAPID_PRIVATE_KEY` in the API's environment (`npm run push:vapid-keys`).
        vapidPublicKey: 'BA3CPp15GUmhVEZzfQ00PBKGvPCUIdR5OExo9RXEobdrHUf4kMoZNWqpGgOXK_PgJpt365Ph4WNdD7Xru__LdIo',
        notificationErrorTime: 5000,
        notificationSuccessTime: 3000,
      },
    },
  ],
};
