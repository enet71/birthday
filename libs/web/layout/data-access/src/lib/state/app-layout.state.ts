import { computed, inject, Injectable, linkedSignal, Signal, signal, TemplateRef, WritableSignal } from '@angular/core';
import { AppLayoutSearch } from '@birthday/web-layout-util';
import { State } from '@birthday/web-shared-data-access';
import { BrowserStorageService, LocalStorageKey, PlatformService } from '@birthday/web-shared-util';

@Injectable({ providedIn: 'root' })
export class AppLayoutState extends State {
  private readonly platform: PlatformService = inject(PlatformService);
  private readonly browserStorage: BrowserStorageService = inject(BrowserStorageService);

  public readonly isSidenavExpanded: WritableSignal<boolean> = linkedSignal(
    () => !this.platform.isRendered() || this.browserStorage.getLocalItem(LocalStorageKey.LAYOUT_MENU_OPENED) !== 'false',
  );
  public readonly pageTitle: WritableSignal<string> = signal('');
  public readonly search: WritableSignal<AppLayoutSearch | null> = signal(null);
  public readonly searchQuery: WritableSignal<string> = signal('');
  public readonly actions: WritableSignal<TemplateRef<unknown> | null> = signal(null);
  // Every page part that is loading data; the header shows one loader while any of them is.
  public readonly loadingSources: WritableSignal<ReadonlySet<object>> = signal(new Set());
  public readonly isLoading: Signal<boolean> = computed(() => this.loadingSources().size > 0);

  public override resetState(): void {
    this.isSidenavExpanded.set(true);
    this.pageTitle.set('');
    this.search.set(null);
    this.searchQuery.set('');
    this.actions.set(null);
    this.loadingSources.set(new Set());
  }
}
