import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { GoogleSignInConfigDto } from '@birthday/shared-models';
import { State } from '@birthday/web-shared-data-access';
import { AuthApiService, GoogleIdentityService } from '../services';
import { AuthStatus, AuthUser } from '../types';

@Injectable({ providedIn: 'root' })
export class AuthState extends State {
  private readonly authApi: AuthApiService = inject(AuthApiService);
  private readonly googleIdentity: GoogleIdentityService = inject(GoogleIdentityService);
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  // The stream stays open, so the resource follows every sign-in and sign-out.
  public readonly userResource: ResourceRef<AuthUser | null | undefined> = rxResource({
    stream: () => this.authApi.userChanges(),
  });
  public readonly user: Signal<AuthUser | null> = computed(() => (this.userResource.hasValue() ? (this.userResource.value() ?? null) : null));
  public readonly status: Signal<AuthStatus> = computed(() => {
    if (this.userResource.isLoading()) {
      return 'unknown';
    }

    return this.user() ? 'signedIn' : 'signedOut';
  });
  public readonly isAuthenticated: Signal<boolean> = computed(() => this.status() === 'signedIn');

  // Loaded in advance once the session is known: the Google popups for signing in and for connecting Google Calendar
  // must open right in the click handler, or browsers block them.
  public readonly googleSignInResource: ResourceRef<GoogleSignInConfigDto | undefined> = rxResource({
    params: () => (this.isBrowser && this.status() !== 'unknown' ? true : undefined),
    stream: () => this.googleIdentity.load().pipe(switchMap(() => this.authApi.getGoogleSignInConfig())),
  });
  public readonly googleSignInConfig: Signal<GoogleSignInConfigDto | null> = computed(() =>
    this.googleSignInResource.hasValue() ? (this.googleSignInResource.value() ?? null) : null,
  );
  public readonly googleClientId: Signal<string | null> = computed(() => this.googleSignInConfig()?.clientId ?? null);
}
