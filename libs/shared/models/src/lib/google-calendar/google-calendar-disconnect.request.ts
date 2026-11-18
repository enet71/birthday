// Sent as query parameters of `DELETE /google-calendar/connection`. `removeEvents` also deletes the birthday events
// Birthdly added to Google Calendar; otherwise they stay there and stop being updated.
export interface GoogleCalendarDisconnectRequest {
  removeEvents: boolean;
}
