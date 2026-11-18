import { computed, effect, inject, Injectable, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  defer,
  EMPTY,
  exhaustMap,
  filter,
  finalize,
  interval,
  merge,
  NEVER,
  Observable,
  repeat,
  Subject,
  Subscription,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';
import { GoogleSignInConfigDto } from '@birthday/shared-models';
import { StateController } from '@birthday/web-shared-data-access';
import { AppTranslateService } from '@birthday/web-shared-i18n';
import { NotificationsService } from '@birthday/web-shared-util';
import { AuthApiService, GoogleIdentityService } from '../services';
import { AuthState } from './auth.state';

// Shorter than the API's 10-minute nonce cookie: asking again keeps the same nonce valid while One Tap stays open.
const NONCE_REFRESH_MS = 5 * 60 * 1000;

// `provideAuth` creates it with the app, so One Tap is offered on every page.
@Injectable({ providedIn: 'root' })
export class AuthController extends StateController {
  private readonly authState: AuthState = inject(AuthState);
  private readonly authApi: AuthApiService = inject(AuthApiService);
  private readonly googleIdentity: GoogleIdentityService = inject(GoogleIdentityService);
  private readonly notifications: NotificationsService = inject(NotificationsService);
  private readonly translator: AppTranslateService = inject(AppTranslateService);
  // The loaded config, `null` when it failed, `undefined` while the first load runs.
  private readonly settledGoogleSignInConfig: Observable<GoogleSignInConfigDto | null | undefined> = toObservable(
    computed(() => this.authState.googleSignInConfig() ?? (this.authState.googleSignInResource.isLoading() ? undefined : null)),
  );

  constructor() {
    super();
    effect(() => {
      if (this.authState.userResource.error()) {
        // Untracked, so a language switch does not show the error again.
        untracked(() => this.notifications.createErrorNotification(this.translator.translate('notifications.auth.restoreFailed')));
      }
    });
    // One Tap is offered while signed out; signing in removes the config, which hides it.
    effect((onCleanup) => {
      const config = this.authState.googleSignInConfig();

      if (config) {
        const subscription = untracked(() => this.offerOneTap(config));

        onCleanup(() => subscription.unsubscribe());
      }
    });
  }

  // Opens the Google popup right away, so call it while handling the click: browsers block popups opened later. The
  // sign-in runs with the app, so it finishes even when the caller is destroyed; the returned Observable completes when
  // it ends and never fails.
  public signInWithGoogle(): Observable<void> {
    const done = new Subject<void>();

    this.settledGoogleSignInConfig
      .pipe(
        filter((config: GoogleSignInConfigDto | null | undefined) => config !== undefined),
        take(1),
        switchMap((config: GoogleSignInConfigDto | null) => (config ? this.googleIdentity.requestCode(config.clientId) : this.failToPrepare())),
        exhaustMap((code: string) => this.authApi.signInWithGoogleCode(code).pipe(tap(() => this.recoverUser()))),
        catchError(() => this.reportSignInFailed()),
        finalize(() => done.complete()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    return done.asObservable();
  }

  public signOut(): Observable<void> {
    return this.authApi.signOut().pipe(
      tap(() => this.googleIdentity.disableAutoSelect()),
      catchError(() => {
        this.notifications.createErrorNotification(this.translator.translate('notifications.auth.signOutFailed'));
        return EMPTY;
      }),
    );
  }

  // Google closes One Tap once an account is picked, so a failed sign-in shows it again. A successful one waits until
  // the signed-in user removes the config.
  private offerOneTap(config: GoogleSignInConfigDto): Subscription {
    const oneTap = defer(() => this.googleIdentity.promptOneTap(config).pipe(take(1))).pipe(
      exhaustMap((credential: string) =>
        this.authApi.signInWithGoogleCredential(credential).pipe(
          tap(() => this.recoverUser()),
          switchMap(() => NEVER),
          catchError(() => {
            // A used or expired nonce gets replaced, which offers One Tap with the new one.
            this.reportSignInFailed();
            return this.refreshGoogleSignInConfig();
          }),
        ),
      ),
      repeat(),
    );
    const nonceRefresh = interval(NONCE_REFRESH_MS).pipe(exhaustMap(() => this.refreshGoogleSignInConfig()));

    return merge(oneTap, nonceRefresh).subscribe();
  }

  // Keeps the last config when the request fails: its client id still opens the popup.
  private refreshGoogleSignInConfig(): Observable<never> {
    return this.authApi.getGoogleSignInConfig().pipe(
      tap((config: GoogleSignInConfigDto) => this.authState.googleSignInResource.set(config)),
      switchMap(() => EMPTY),
      catchError(() => EMPTY),
    );
  }

  // The API pushes the signed-in user into the user stream; a stream that failed on the restore has ended and must load
  // again.
  private recoverUser(): void {
    if (this.authState.userResource.error()) {
      this.authState.userResource.reload();
    }
  }

  // Google's script or the config did not load; the next click can work.
  private failToPrepare(): Observable<never> {
    this.authState.googleSignInResource.reload();
    return throwError(() => new Error('Google sign-in is not ready'));
  }

  private reportSignInFailed(): Observable<never> {
    this.notifications.createErrorNotification(this.translator.translate('notifications.auth.signInFailed'));
    return EMPTY;
  }
}
