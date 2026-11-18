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
  of,
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
import { GoogleConsentDeniedError } from '../errors';
import { AuthApiService, GoogleIdentityService } from '../services';
import { GoogleCodeRequestOptions } from '../types';
import { AuthState } from './auth.state';

// Shorter than the API's 10-minute nonce cookie: asking again keeps the same nonce valid while One Tap stays open.
const NONCE_REFRESH_MS = 5 * 60 * 1000;
const SIGN_IN_SCOPES = 'openid email profile';

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
    // One Tap is offered while signed out; signing in hides it. It reads its own nonce, so only the client id counts here.
    effect((onCleanup) => {
      const clientId = this.authState.googleClientId();

      if (clientId && this.authState.status() === 'signedOut') {
        const subscription = untracked(() => this.offerOneTap());

        onCleanup(() => subscription.unsubscribe());
      }
    });
  }

  // Opens the Google popup right away, so call it while handling the click: browsers block popups opened later. The
  // sign-in runs with the app, so it finishes even when the caller is destroyed; the returned Observable completes when
  // it ends and never fails.
  public signInWithGoogle(): Observable<void> {
    const done = new Subject<void>();

    this.requestGoogleCode({ scope: SIGN_IN_SCOPES })
      .pipe(
        exhaustMap((code: string) => this.authApi.signInWithGoogleCode(code).pipe(tap(() => this.recoverUser()))),
        // Denying the consent cancels the sign-in like closing the popup.
        catchError((error: unknown) => (error instanceof GoogleConsentDeniedError ? EMPTY : this.reportSignInFailed())),
        finalize(() => done.complete()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    return done.asObservable();
  }

  // Opens the Google popup for `options` and emits the authorization code; see `GoogleIdentityService.requestCode`.
  // Subscribe while handling the click. Fails when Google's script or the config could not be loaded.
  public requestGoogleCode(options: GoogleCodeRequestOptions): Observable<string> {
    return this.settledGoogleSignInConfig.pipe(
      filter((config: GoogleSignInConfigDto | null | undefined) => config !== undefined),
      take(1),
      switchMap((config: GoogleSignInConfigDto | null) =>
        config ? this.googleIdentity.requestCode(config.clientId, options) : this.failToPrepare(),
      ),
    );
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

  // The loaded config may hold a nonce that a sign-in used up or that expired while the user was signed in, so every
  // offer asks for the current one and prompts with it. Google closes One Tap once an account is picked: a failed
  // sign-in starts a new offer, a successful one waits until the signed-in status hides it.
  private offerOneTap(): Subscription {
    const oneTap = defer(() => this.currentGoogleSignInConfig()).pipe(
      switchMap((config: GoogleSignInConfigDto) => this.googleIdentity.promptOneTap(config).pipe(take(1))),
      exhaustMap((credential: string) =>
        this.authApi.signInWithGoogleCredential(credential).pipe(
          tap(() => this.recoverUser()),
          switchMap(() => NEVER),
          catchError(() => this.reportSignInFailed()),
        ),
      ),
      repeat(),
    );
    // Asking again keeps the nonce cookie, and with it the open prompt's nonce, valid.
    const nonceRefresh = interval(NONCE_REFRESH_MS).pipe(
      exhaustMap(() => this.authApi.getGoogleSignInConfig().pipe(catchError(() => EMPTY))),
      switchMap(() => EMPTY),
    );

    return merge(oneTap, nonceRefresh).subscribe();
  }

  // Falls back to the loaded config when the request fails.
  private currentGoogleSignInConfig(): Observable<GoogleSignInConfigDto> {
    return this.authApi.getGoogleSignInConfig().pipe(
      catchError(() => {
        const config = this.authState.googleSignInConfig();

        return config ? of(config) : EMPTY;
      }),
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
