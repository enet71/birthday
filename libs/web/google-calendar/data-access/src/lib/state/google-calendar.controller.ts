import { effect, inject, Injectable, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, exhaustMap, finalize, map, Observable, Subject, tap } from 'rxjs';
import { GOOGLE_CALENDAR_SCOPES } from '@birthday/shared-models';
import { AuthController, AuthState, GoogleConsentDeniedError } from '@birthday/web-auth-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { NotificationsService } from '@birthday/web-shared-util';
import { GoogleCalendarApiService } from '../services';
import { GoogleCalendarConnectResult, GoogleCalendarStatus, GoogleCalendarSyncResult } from '../types';
import { GoogleCalendarState } from './google-calendar.state';
import { AppTranslateService } from '@birthday/web-shared-i18n';

@Injectable({ providedIn: 'root' })
export class GoogleCalendarController extends StateController {
  private readonly googleCalendarState: GoogleCalendarState = inject(GoogleCalendarState);
  private readonly googleCalendarApi: GoogleCalendarApiService = inject(GoogleCalendarApiService);
  private readonly authController: AuthController = inject(AuthController);
  private readonly authState: AuthState = inject(AuthState);
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

  // Opens the Google popup right away, so call it while handling the click: browsers block popups opened later.
  // Connecting runs with the app, so it finishes even when the caller is destroyed; the returned Observable completes
  // when it ends and never fails. Closing the popup ends it without a message.
  public connect(): Observable<void> {
    const done = new Subject<void>();

    this.authController
      .requestGoogleCode({ scope: GOOGLE_CALENDAR_SCOPES.join(' '), loginHint: this.authState.user()?.email ?? undefined })
      .pipe(
        exhaustMap((code: string) => this.googleCalendarApi.complete(code)),
        tap((result: GoogleCalendarConnectResult) => {
          if (result === 'connected') {
            this.notifications.createSuccessNotification(this.translator.translate('notifications.googleCalendar.connected'));
            this.setStatus('connected');
          } else {
            this.reportConnectDenied();
          }
        }),
        catchError((error: unknown) => {
          if (error instanceof GoogleConsentDeniedError) {
            this.reportConnectDenied();
          } else {
            this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.connectRetry'));
          }
          return EMPTY;
        }),
        finalize(() => done.complete()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    return done.asObservable();
  }

  // The methods below complete without emitting when the request fails.
  // "Sync now": always reports the outcome. Emits once when the sync finished.
  public syncNow(): Observable<void> {
    return this.googleCalendarApi.sync(true).pipe(
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
    return this.googleCalendarApi.sync(false).pipe(
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

  public disconnect(removeEvents: boolean): Observable<void> {
    return this.googleCalendarApi.disconnect(removeEvents).pipe(
      tap(() => this.setStatus('disconnected')),
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.googleCalendar.disconnectFailed'));
        return EMPTY;
      }),
    );
  }
}
