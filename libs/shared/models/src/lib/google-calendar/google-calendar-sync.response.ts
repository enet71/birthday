// `skipped` means no sync ran: another one is running or one ran recently. `revoked` means Google no longer accepts
// the saved access.
export interface GoogleCalendarSyncResponse {
  skipped: boolean;
  revoked: boolean;
  added: number;
  updated: number;
  deleted: number;
}
