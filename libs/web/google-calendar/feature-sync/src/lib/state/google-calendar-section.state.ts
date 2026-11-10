import { computed, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { GoogleCalendarState } from '@birthday/web-google-calendar-data-access';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { PlatformService } from '@birthday/web-shared-util';
import { GoogleCalendarSectionView } from '../types';

@Injectable()
export class GoogleCalendarSectionState extends State {
  private readonly googleCalendarState: ReadonlyState<GoogleCalendarState> = injectState(GoogleCalendarState);
  private readonly platform: PlatformService = inject(PlatformService);

  public readonly isPending: WritableSignal<boolean> = signal(false);
  // The session is known only in the browser, so the server and the first client render show the loading view.
  public readonly view: Signal<GoogleCalendarSectionView> = computed(() => {
    // A reload after "Sync now" keeps the current view, so the button stays focused.
    const isFirstLoad: boolean = this.googleCalendarState.isLoading() && !this.googleCalendarState.connectionResource.hasValue();

    if (!this.platform.isRendered() || isFirstLoad) {
      return 'loading';
    }
    if (this.googleCalendarState.connectionResource.error()) {
      return 'error';
    }

    return this.googleCalendarState.connection()?.status ?? 'disconnected';
  });
  public readonly lastSyncedAt: Signal<string | null> = computed(() => this.googleCalendarState.connection()?.lastSyncedAt ?? null);

  public override resetState(): void {
    this.isPending.set(false);
  }
}
