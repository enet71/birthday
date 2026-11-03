// `revoked` means Google no longer accepts the saved access, so the user has to connect again.
export type GoogleCalendarStatus = 'connected' | 'revoked' | 'disconnected';

// `denied` means the user did not grant every scope on Google's consent page.
export type GoogleCalendarConnectResult = 'connected' | 'denied';

// `skipped` means no sync ran: another one is running or one ran recently. `revoked` means Google no longer accepts
// the saved access.
export interface GoogleCalendarSyncResult {
  skipped: boolean;
  revoked: boolean;
  added: number;
  updated: number;
  deleted: number;
}

export interface GoogleCalendarConnection {
  status: GoogleCalendarStatus;
  // ISO date-time of the last finished sync.
  lastSyncedAt: string | null;
}
