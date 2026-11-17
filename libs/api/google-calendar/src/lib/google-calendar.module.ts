import { Global, Module } from '@nestjs/common';
import { BirthdayChangesListener } from '@birthday/api-birthdays';
import { GoogleCalendarController } from './google-calendar.controller';
import { ConfigurableModuleClass } from './google-calendar.module-definition';
import {
  GoogleApiClient,
  GoogleCalendarEventsService,
  GoogleCalendarJobsService,
  GoogleCalendarPushQueue,
  GoogleCalendarService,
  GoogleConnectionsService,
  GoogleImportService,
  GoogleOAuthService,
  OAuthStateService,
  TokenCipher,
} from './services';

// Global, so `BirthdaysModule` receives the `BirthdayChangesListener` that mirrors birthday changes into Google
// Calendar without importing this module.
@Global()
@Module({
  controllers: [GoogleCalendarController],
  providers: [
    TokenCipher,
    OAuthStateService,
    GoogleOAuthService,
    GoogleApiClient,
    GoogleConnectionsService,
    GoogleCalendarEventsService,
    GoogleCalendarPushQueue,
    GoogleImportService,
    GoogleCalendarJobsService,
    GoogleCalendarService,
    { provide: BirthdayChangesListener, useExisting: GoogleCalendarPushQueue },
  ],
  exports: [BirthdayChangesListener],
})
export class GoogleCalendarModule extends ConfigurableModuleClass {}
