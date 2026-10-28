import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { AuthState } from '@birthday/web-auth-data-access';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { PlatformService } from '@birthday/web-shared-util';
import { AccountView } from '../types';

@Injectable()
export class AccountState extends State {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly platform: PlatformService = inject(PlatformService);

  public readonly isPending: WritableSignal<boolean> = signal(false);
  // The session is known only in the browser, so the server and the first client render show the loading view.
  public readonly view: Signal<AccountView> = computed(() => {
    const status = this.authState.status();

    return !this.platform.isRendered() || status === 'unknown' ? 'loading' : status;
  });
  public readonly email: Signal<string> = computed(() => this.authState.user()?.email ?? '');

  public override resetState(): void {
    this.isPending.set(false);
  }
}
