import { Observable } from 'rxjs';
import { GoogleCalendarConnection, GoogleCalendarConnectResult, GoogleCalendarSyncResult } from '../types';

// The backend of the Google Calendar sync. The app config picks the implementation.
export abstract class GoogleCalendarClient {
  // Emits `null` when the user has never connected Google Calendar.
  public abstract getConnection(): Observable<GoogleCalendarConnection | null>;

  // Leaves the app for Google's consent page. Google returns the user to `redirectUri` with `code` and `state`.
  public abstract connect(redirectUri: string): Observable<void>;

  // Finishes connecting with the `code` and `state` Google added to the redirect URI.
  public abstract completeConnect(code: string, state: string): Observable<GoogleCalendarConnectResult>;

  public abstract disconnect(): Observable<void>;

  // Imports changes from Google. A `manual` sync also repairs Birthdly's birthdays in Google and is limited less often.
  public abstract sync(manual: boolean): Observable<GoogleCalendarSyncResult>;
}
