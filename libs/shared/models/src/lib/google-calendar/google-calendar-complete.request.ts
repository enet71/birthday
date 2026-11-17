// `code` and `state` come from the redirect URI; `nonce` is the one sent when connecting started.
export interface GoogleCalendarCompleteRequest {
  code: string;
  state: string;
  nonce: string;
}
