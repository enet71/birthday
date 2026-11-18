import { computed, inject, Injectable, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { State } from '@birthday/web-shared-data-access';
import { AuthApiService } from '../services';
import { AuthStatus, AuthUser } from '../types';

@Injectable({ providedIn: 'root' })
export class AuthState extends State {
  private readonly authApi: AuthApiService = inject(AuthApiService);

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
}
