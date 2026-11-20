import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { AuthState } from '@birthday/web-auth-data-access';
import { InviteLoadResult, InviteSubmitError } from '../types';

// The guest side of an invite link: who collects the birthdays and how sending one went.
@Injectable()
export class InviteState extends State {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);

  public readonly token: WritableSignal<string | null> = signal(null);
  // Set by the resolver before the page shows.
  public readonly loadResult: WritableSignal<InviteLoadResult | null> = signal(null);
  public readonly isRetrying: WritableSignal<boolean> = signal(false);
  public readonly isSending: WritableSignal<boolean> = signal(false);
  public readonly isSent: WritableSignal<boolean> = signal(false);
  public readonly submitError: WritableSignal<InviteSubmitError | null> = signal(null);

  public readonly displayName: Signal<string | null> = computed(() => this.getDisplayName());
  // A guest with an account already has a calendar, so the page does not offer to create one.
  public readonly isAuthenticated: Signal<boolean> = this.authState.isAuthenticated;

  private getDisplayName(): string | null {
    const result: InviteLoadResult | null = this.loadResult();

    return result?.status === 'ready' ? result.invite.displayName : null;
  }
}
