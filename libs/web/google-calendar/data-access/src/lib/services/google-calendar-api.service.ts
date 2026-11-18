import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  GoogleCalendarCompleteRequest,
  GoogleCalendarCompleteResponse,
  GoogleCalendarDisconnectRequest,
  GoogleCalendarSyncRequest,
} from '@birthday/shared-models';
import { ApiService } from '@birthday/web-shared-data-access';
import { GoogleCalendarConnection, GoogleCalendarConnectResult, GoogleCalendarSyncResult } from '../types';

// The Google Calendar sync through the API.
@Injectable({ providedIn: 'root' })
export class GoogleCalendarApiService extends ApiService {
  private readonly url = `${this.baseUrl}/google-calendar`;

  // Emits `null` when the user has never connected Google Calendar.
  public getConnection(): Observable<GoogleCalendarConnection | null> {
    return this.httpClient.get<GoogleCalendarConnection | null>(`${this.url}/connection`).pipe(map((connection) => connection ?? null));
  }

  // Finishes connecting with the authorization code from the Google popup.
  public complete(code: string): Observable<GoogleCalendarConnectResult> {
    const body: GoogleCalendarCompleteRequest = { code };

    return this.httpClient
      .post<GoogleCalendarCompleteResponse>(`${this.url}/complete`, body)
      .pipe(map((response: GoogleCalendarCompleteResponse) => response.result));
  }

  // Imports changes from Google. A `manual` sync also repairs Birthdly's birthdays in Google and is limited less often.
  public sync(manual: boolean): Observable<GoogleCalendarSyncResult> {
    const body: GoogleCalendarSyncRequest = { manual };

    return this.httpClient.post<GoogleCalendarSyncResult>(`${this.url}/sync`, body);
  }

  // `removeEvents` also deletes the birthdays Birthdly added to Google Calendar.
  public disconnect(removeEvents: boolean): Observable<void> {
    const params: GoogleCalendarDisconnectRequest = { removeEvents };

    return this.httpClient.delete<void>(`${this.url}/connection`, { params: { ...params } });
  }
}
