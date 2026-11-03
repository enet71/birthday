import { computed, inject, Injectable, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AuthState } from '@birthday/web-auth-data-access';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { GoogleCalendarClient } from '../services';
import { GoogleCalendarConnection } from '../types';

@Injectable({ providedIn: 'root' })
export class GoogleCalendarState extends State {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly googleCalendarClient: GoogleCalendarClient = inject(GoogleCalendarClient);

  // Loads only for a signed-in user and again after every change of user.
  public readonly connectionResource: ResourceRef<GoogleCalendarConnection | null | undefined> = rxResource({
    params: () => this.authState.user()?.id,
    stream: () => this.googleCalendarClient.getConnection(),
  });
  public readonly connection: Signal<GoogleCalendarConnection | null> = computed(() =>
    this.connectionResource.hasValue() ? (this.connectionResource.value() ?? null) : null,
  );
  public readonly isConnected: Signal<boolean> = computed(() => this.connection()?.status === 'connected');
  public readonly isLoading: Signal<boolean> = computed(() => this.authState.status() === 'unknown' || this.connectionResource.isLoading());

  public override resetState(): void {
    this.connectionResource.set(null);
  }
}
