import { GoogleCalendarStatus } from '@birthday/web-google-calendar-data-access';

// `error` means the connection status could not be loaded.
export type GoogleCalendarSectionView = 'loading' | 'error' | GoogleCalendarStatus;
