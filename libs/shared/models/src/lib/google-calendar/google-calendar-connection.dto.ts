// `revoked` means Google no longer accepts the saved access, so the user has to connect again.
export type GoogleCalendarStatus = 'connected' | 'revoked' | 'disconnected';

export interface GoogleCalendarConnectionDto {
  status: GoogleCalendarStatus;
  // ISO date-time of the last finished sync.
  lastSyncedAt: string | null;
}
