// `denied` means the user did not grant every scope on Google's consent page.
export type GoogleCalendarConnectResult = 'connected' | 'denied';

export interface GoogleCalendarCompleteResponse {
  result: GoogleCalendarConnectResult;
}
