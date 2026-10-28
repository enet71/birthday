import { effect, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, Observable } from 'rxjs';
import { StateController } from '@birthday/web-shared-data-access';
import { NotificationsService } from '@birthday/web-shared-util';
import { AuthClient } from '../services';
import { AuthState } from './auth.state';

@Injectable({ providedIn: 'root' })
export class AuthController extends StateController {
  private readonly authState: AuthState = inject(AuthState);
  private readonly authClient: AuthClient = inject(AuthClient);
  private readonly notifications: NotificationsService = inject(NotificationsService);

  constructor() {
    super();
    effect(() => {
      if (this.authState.userResource.error()) {
        this.notifications.createErrorNotification("Couldn't restore your session");
      }
    });
    this.authClient
      .completeSignIn()
      .pipe(
        catchError(() => {
          this.notifications.createErrorNotification("Couldn't finish signing in. Please try again");
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
        this.notifications.createErrorNotification("Couldn't sign in with Google");
        return EMPTY;
      }),
    );
  }

  public signOut(): Observable<void> {
    return this.authClient.signOut().pipe(
      catchError(() => {
        this.notifications.createErrorNotification("Couldn't sign out");
        return EMPTY;
      }),
    );
  }
}
