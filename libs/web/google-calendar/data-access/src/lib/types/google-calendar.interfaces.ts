import { GoogleCalendarConnectionDto, GoogleCalendarConnectResult, GoogleCalendarStatus, GoogleCalendarSyncResponse } from '@birthday/shared-models';

// The API contract types under the names the web app uses.
export type { GoogleCalendarConnectResult, GoogleCalendarStatus };
export type GoogleCalendarConnection = GoogleCalendarConnectionDto;
export type GoogleCalendarSyncResult = GoogleCalendarSyncResponse;
