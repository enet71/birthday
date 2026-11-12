import { effect, inject, Injectable, untracked } from '@angular/core';
import { catchError, EMPTY, map, Observable, tap } from 'rxjs';
import { StateController } from '@birthday/web-shared-data-access';
import { NotificationsService } from '@birthday/web-shared-util';
import { GoogleCalendarClient } from '../services';
import { GoogleCalendarConnectResult, GoogleCalendarStatus, GoogleCalendarSyncResult } from '../types';
import { GoogleCalendarState } from './google-calendar.state';
import { AppTranslateService } from '@birthday/web-shared-i18n';

@Injectable({ providedIn: 'root' })
export class GoogleCalendarController extends StateController {
  private readonly googleCalendarState: GoogleCalendarState = inject(GoogleCalendarState);
  private readonly googleCalendarClient: GoogleCalendarClient = inject(GoogleCalendarClient);
  private readonly notifications: NotificationsService = inject(NotificationsService);
  private readonly translator: AppTranslateService = inject(AppTranslateService);

  constructor() {
    super();
    effect(() => {
      if (this.googleCalendarState.connectionResource.error()) {
        // Untracked, so a language switch does not show the error again.
        untracked(() => this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.statusFailed')));
      }
    });
  }

  // Reloads on every entry to the screen, which also retries a failed load.
  public reloadConnection(): void {
    this.googleCalendarState.connectionResource.reload();
  }

  // The methods below complete without emitting when the request fails.
  public connect(redirectUri: string): Observable<void> {
    return this.googleCalendarClient.connect(redirectUri).pipe(
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.connectFailed'));
        return EMPTY;
      }),
    );
  }

  public completeConnect(code: string, state: string): Observable<void> {
    return this.googleCalendarClient.completeConnect(code, state).pipe(
      tap((result: GoogleCalendarConnectResult) => {
        if (result === 'connected') {
          this.notifications.createSuccessNotification(this.translator.translate('notifications.googleCalendar.connected'));
          this.setStatus('connected');
        } else {
          this.reportConnectDenied();
        }
      }),
      map(() => undefined),
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.connectRetry'));
        return EMPTY;
      }),
    );
  }

  // "Sync now": always reports the outcome. Emits once when the sync finished.
  public syncNow(): Observable<void> {
    return this.googleCalendarClient.sync(true).pipe(
      tap((result: GoogleCalendarSyncResult) => {
        if (result.revoked) {
          this.reportRevoked();
        } else if (result.skipped) {
          this.notifications.createSuccessNotification(this.translator.translate('notifications.googleCalendar.syncedRecently'));
        } else {
          this.notifications.createSuccessNotification(
            this.describeChanges(result) ?? this.translator.translate('notifications.googleCalendar.upToDate'),
          );
          this.reloadConnection();
        }
      }),
      map(() => undefined),
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.syncFailed'));
        return EMPTY;
      }),
    );
  }

  // The automatic import on opening the app reports only changes and problems. Emits `true` when birthdays changed.
  public syncAutomatically(): Observable<boolean> {
    return this.googleCalendarClient.sync(false).pipe(
      map((result: GoogleCalendarSyncResult) => {
        const changes: string | null = this.describeChanges(result);

        if (result.revoked) {
          this.reportRevoked();
        } else if (!result.skipped) {
          this.reloadConnection();
        }
        if (changes) {
          this.notifications.createSuccessNotification(changes);
        }
        return changes !== null;
      }),
      // A background import that failed is retried on the next opening; it must not interrupt the user.
      catchError(() => EMPTY),
    );
  }

  // `error` is the error code Google added to the redirect page.
  public reportConsentError(error: string): void {
    if (error === 'access_denied') {
      this.reportConnectDenied();
    } else {
      this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.connectRetry'));
    }
  }

  private reportConnectDenied(): void {
    this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.accessDenied'));
  }

  private reportRevoked(): void {
    this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.accessLost'));
    this.reloadConnection();
  }

  // For example "From Google: 2 added, 1 updated"; `null` when nothing changed.
  private describeChanges({ added, updated, deleted }: GoogleCalendarSyncResult): string | null {
    const parts: string[] = [
      added > 0 ? this.translator.translatePlural('notifications.googleCalendar.added', added) : '',
      updated > 0 ? this.translator.translatePlural('notifications.googleCalendar.updated', updated) : '',
      deleted > 0 ? this.translator.translatePlural('notifications.googleCalendar.deleted', deleted) : '',
    ].filter(Boolean);

    return parts.length > 0 ? this.translator.translate('notifications.googleCalendar.fromGoogle', { changes: parts.join(', ') }) : null;
  }

  private setStatus(status: GoogleCalendarStatus): void {
    const isLoading: boolean = this.googleCalendarState.connectionResource.isLoading();

    this.googleCalendarState.connectionResource.set({ status, lastSyncedAt: this.googleCalendarState.connection()?.lastSyncedAt ?? null });
    // `set()` aborts an in-flight load, so load the status again with the change.
    if (isLoading) {
      this.reloadConnection();
    }
  }

  public disconnect(): Observable<void> {
    return this.googleCalendarClient.disconnect().pipe(
      tap(() => this.setStatus('disconnected')),
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.disconnectFailed'));
        return EMPTY;
      }),
    );
  }
}
