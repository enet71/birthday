import { computed, inject, Injectable, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CelebrityImportsStatusResponse } from '@birthday/shared-models';
import { AdminApiService } from '@birthday/web-admin-data-access';
import { AuthState } from '@birthday/web-auth-data-access';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { PlatformService } from '@birthday/web-shared-util';
import { AdminImportStage } from '../types';

@Injectable()
export class AdminImportsState extends State {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly adminApi: AdminApiService = inject(AdminApiService);
  private readonly platform: PlatformService = inject(PlatformService);

  // Loads in the browser only (the server does not know the user) and only for a signed-in user. `null` means the user
  // is not an admin.
  public readonly statusResource: ResourceRef<CelebrityImportsStatusResponse | null | undefined> = rxResource({
    params: () => (this.platform.isRendered() && this.authState.status() === 'signedIn' ? this.authState.user()?.id : undefined),
    stream: () => this.adminApi.getCelebrityImportsStatus(),
  });
  public readonly status: Signal<CelebrityImportsStatusResponse | null> = computed(() =>
    this.statusResource.hasValue() ? (this.statusResource.value() ?? null) : null,
  );
  // The server always sees a signed-out visitor, so it renders the spinner, not "Page not found", to keep admins from a
  // flash of it on every full load.
  public readonly isNotFound: Signal<boolean> = computed(
    () =>
      (this.platform.isRendered() && this.authState.status() === 'signedOut') ||
      (this.statusResource.hasValue() && this.statusResource.value() === null),
  );
  public readonly hasLoadError: Signal<boolean> = computed(() => !!this.statusResource.error());
  public readonly isLoading: Signal<boolean> = computed(() => !this.status() && !this.isNotFound() && !this.hasLoadError());
  public readonly isRefreshing: Signal<boolean> = computed(() => this.statusResource.isLoading());
  public readonly stages: Signal<AdminImportStage[]> = computed(() => this.buildStages(this.status()));
  // Something still waits, runs or will be retried.
  public readonly isImportRunning: Signal<boolean> = computed(
    () => !!this.status()?.queues.some(({ counts }) => counts.created + counts.active + counts.retry > 0),
  );

  private buildStages(status: CelebrityImportsStatusResponse | null): AdminImportStage[] {
    if (!status) {
      return [];
    }

    const { people, withDetails, withPageviews } = status.progress;

    return [
      { label: 'Details (names, links, field)', done: withDetails, total: people, percent: toPercent(withDetails, people) },
      { label: 'Page views', done: withPageviews, total: people, percent: toPercent(withPageviews, people) },
    ];
  }
}

function toPercent(done: number, total: number): number {
  return total ? Math.floor((done / total) * 100) : 0;
}
