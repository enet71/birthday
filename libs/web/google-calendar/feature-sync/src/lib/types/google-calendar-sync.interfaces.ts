import { GoogleCalendarStatus } from '@birthday/web-google-calendar-data-access';

// `error` means the connection status could not be loaded.
export type GoogleCalendarSectionView = 'loading' | 'error' | GoogleCalendarStatus;

// What the disconnect dialog closes with when the user confirms; it closes with nothing when cancelled.
export interface GoogleCalendarDisconnectDialogResult {
  removeEvents: boolean;
}
