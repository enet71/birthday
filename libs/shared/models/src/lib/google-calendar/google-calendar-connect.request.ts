// `redirectUri` is the app page Google returns to; `nonce` ties the return to the browser tab that started connecting.
export interface GoogleCalendarConnectRequest {
  redirectUri: string;
  nonce: string;
}
