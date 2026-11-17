import { DOCUMENT, inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  GoogleCalendarCompleteRequest,
  GoogleCalendarCompleteResponse,
  GoogleCalendarConnectRequest,
  GoogleCalendarConnectResponse,
  GoogleCalendarSyncRequest,
} from '@birthday/shared-models';
import { ApiService } from '@birthday/web-shared-data-access';
import { BrowserStorageService } from '@birthday/web-shared-util';
import { GoogleCalendarConnection, GoogleCalendarConnectResult, GoogleCalendarSyncResult } from '../types';
import { GoogleCalendarClient } from './google-calendar.client';

// Ties the Google redirect to the browser tab that started connecting.
const CONNECT_NONCE_KEY = 'googleCalendarConnectNonce';

// The Google Calendar sync through the API.
@Injectable({ providedIn: 'root' })
export class GoogleCalendarApiService extends ApiService implements GoogleCalendarClient {
  private readonly document: Document = inject(DOCUMENT);
  private readonly browserStorage: BrowserStorageService = inject(BrowserStorageService);
  private readonly url = `${this.baseUrl}/google-calendar`;

  public getConnection(): Observable<GoogleCalendarConnection | null> {
    return this.httpClient.get<GoogleCalendarConnection | null>(`${this.url}/connection`).pipe(map((connection) => connection ?? null));
  }

  public connect(redirectUri: string): Observable<void> {
    const body: GoogleCalendarConnectRequest = { redirectUri, nonce: this.createNonce() };

    this.browserStorage.sessionStorage?.setItem(CONNECT_NONCE_KEY, body.nonce);
    return this.httpClient
      .post<GoogleCalendarConnectResponse>(`${this.url}/connect`, body)
      .pipe(map((response: GoogleCalendarConnectResponse) => this.document.location.assign(response.url)));
  }

  public completeConnect(code: string, state: string): Observable<GoogleCalendarConnectResult> {
    const body: GoogleCalendarCompleteRequest = { code, state, nonce: this.browserStorage.sessionStorage?.getItem(CONNECT_NONCE_KEY) ?? '' };

    this.browserStorage.sessionStorage?.removeItem(CONNECT_NONCE_KEY);
    return this.httpClient
      .post<GoogleCalendarCompleteResponse>(`${this.url}/complete`, body)
      .pipe(map((response: GoogleCalendarCompleteResponse) => response.result));
  }

  public sync(manual: boolean): Observable<GoogleCalendarSyncResult> {
    const body: GoogleCalendarSyncRequest = { manual };

    return this.httpClient.post<GoogleCalendarSyncResult>(`${this.url}/sync`, body);
  }

  public disconnect(): Observable<void> {
    return this.httpClient.delete<void>(`${this.url}/connection`);
  }

  // `crypto.randomUUID` is unavailable outside secure contexts (e.g. a LAN IP over HTTP).
  private createNonce(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte: number) => byte.toString(16).padStart(2, '0')).join('');
  }
}
