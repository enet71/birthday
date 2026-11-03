import { DOCUMENT, inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  GoogleCalendarClient,
  GoogleCalendarConnection,
  GoogleCalendarConnectResult,
  GoogleCalendarSyncResult,
} from '@birthday/web-google-calendar-data-access';
import { BrowserStorageService } from '@birthday/web-shared-util';
import { SUPABASE_CLIENT, SupabaseDatabaseClient } from '../client';
import { fromSupabase } from '../helpers';
import { Tables } from '../types';

// Ties the Google redirect to the browser tab that started connecting.
const CONNECT_NONCE_KEY = 'googleCalendarConnectNonce';

type ConnectionRow = Pick<Tables<'google_calendar_connections'>, 'status' | 'last_synced_at'>;

interface ConnectResponse {
  url: string;
}

interface CompleteConnectResponse {
  result: GoogleCalendarConnectResult;
}

type SyncResponse = Partial<GoogleCalendarSyncResult>;

// RLS returns only the signed-in user's connection; the Edge Functions own every change to it.
@Injectable({ providedIn: 'root' })
export class GoogleCalendarSupabaseClient extends GoogleCalendarClient {
  private readonly supabase: SupabaseDatabaseClient = inject(SUPABASE_CLIENT);
  private readonly document: Document = inject(DOCUMENT);
  private readonly browserStorage: BrowserStorageService = inject(BrowserStorageService);

  public getConnection(): Observable<GoogleCalendarConnection | null> {
    return fromSupabase(() => this.supabase.from('google_calendar_connections').select('status, last_synced_at').maybeSingle()).pipe(
      map(({ data }) => (data ? this.toConnection(data) : null)),
    );
  }

  public connect(redirectUri: string): Observable<void> {
    const nonce: string = this.createNonce();

    this.browserStorage.sessionStorage?.setItem(CONNECT_NONCE_KEY, nonce);
    return fromSupabase(() => this.supabase.functions.invoke<ConnectResponse>('google-calendar-connect', { body: { redirectUri, nonce } })).pipe(
      map(({ data }) => {
        if (!data?.url) {
          throw new Error('The connect response has no consent URL');
        }

        this.document.location.assign(data.url);
      }),
    );
  }

  public completeConnect(code: string, state: string): Observable<GoogleCalendarConnectResult> {
    const nonce: string | null = this.browserStorage.sessionStorage?.getItem(CONNECT_NONCE_KEY) ?? null;

    this.browserStorage.sessionStorage?.removeItem(CONNECT_NONCE_KEY);
    return fromSupabase(() =>
      this.supabase.functions.invoke<CompleteConnectResponse>('google-calendar-complete', { body: { code, state, nonce } }),
    ).pipe(
      map(({ data }) => {
        if (!data?.result) {
          throw new Error('The complete response has no result');
        }

        return data.result;
      }),
    );
  }

  public sync(manual: boolean): Observable<GoogleCalendarSyncResult> {
    return fromSupabase(() => this.supabase.functions.invoke<SyncResponse>('google-calendar-pull', { body: { manual } })).pipe(
      map(({ data }) => ({
        skipped: data?.skipped ?? true,
        revoked: data?.revoked ?? false,
        added: data?.added ?? 0,
        updated: data?.updated ?? 0,
        deleted: data?.deleted ?? 0,
      })),
    );
  }

  public disconnect(): Observable<void> {
    return fromSupabase(() => this.supabase.functions.invoke('google-calendar-disconnect')).pipe(map(() => undefined));
  }

  // `crypto.randomUUID` is unavailable outside secure contexts (e.g. a LAN IP over HTTP).
  private createNonce(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte: number) => byte.toString(16).padStart(2, '0')).join('');
  }

  private toConnection(row: ConnectionRow): GoogleCalendarConnection {
    return { status: row.status as GoogleCalendarConnection['status'], lastSyncedAt: row.last_synced_at };
  }
}
