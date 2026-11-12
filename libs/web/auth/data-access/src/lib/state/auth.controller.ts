import { effect, inject, Injectable, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, Observable } from 'rxjs';
import { StateController } from '@birthday/web-shared-data-access';
import { NotificationsService } from '@birthday/web-shared-util';
import { AuthClient } from '../services';
import { AuthState } from './auth.state';
import { AppTranslateService } from '@birthday/web-shared-i18n';

@Injectable({ providedIn: 'root' })
export class AuthController extends StateController {
  private readonly authState: AuthState = inject(AuthState);
  private readonly authClient: AuthClient = inject(AuthClient);
  private readonly notifications: NotificationsService = inject(NotificationsService);
  private readonly translator: AppTranslateService = inject(AppTranslateService);

  constructor() {
    super();
    effect(() => {
      if (this.authState.userResource.error()) {
        // Untracked, so a language switch does not show the error again.
        untracked(() => this.notifications.createErrorNotification(this.translator.translate('notifications.auth.restoreFailed')));
      }
    });
    this.authClient
      .completeSignIn()
      .pipe(
        catchError(() => {
          this.notifications.createErrorNotification(this.translator.translate('notifications.auth.finishSignInFailed'));
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  // The methods below complete without emitting when the request fails.
  public signInWithGoogle(): Observable<void> {
    return this.authClient.signInWithGoogle().pipe(
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.auth.signInFailed'));
        return EMPTY;
      }),
    );
  }

  public signOut(): Observable<void> {
    return this.authClient.signOut().pipe(
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.auth.signOutFailed'));
        return EMPTY;
      }),
    );
  }
}
