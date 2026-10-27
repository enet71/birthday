import { effect, inject, Injectable, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, Event as RouterEvent, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { APP_LAYOUT_SEARCH_DATA_KEY, AppLayoutSearch } from '@birthday/web-layout-util';
import { StateController } from '@birthday/web-shared-data-access';
import { BrowserStorageService, LocalStorageKey, PlatformService } from '@birthday/web-shared-util';
import { AppLayoutState } from './app-layout.state';

@Injectable({ providedIn: 'root' })
export class AppLayoutController extends StateController {
  private readonly appLayoutState: AppLayoutState = inject(AppLayoutState);
  private readonly router: Router = inject(Router);
  private readonly platform: PlatformService = inject(PlatformService);
  private readonly browserStorage: BrowserStorageService = inject(BrowserStorageService);

  constructor() {
    super();

    this.router.events
      .pipe(
        filter((event: RouterEvent): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.applyRoute());

    effect(() => {
      const isExpanded: boolean = this.appLayoutState.isSidenavExpanded();

      if (this.platform.isRendered()) {
        this.saveSidenav(isExpanded);
      }
    });
  }

  public toggleSidenav(): void {
    this.appLayoutState.isSidenavExpanded.update((value: boolean) => !value);
  }

  public setSearchQuery(query: string): void {
    this.appLayoutState.searchQuery.set(query);
  }

  public setActions(actions: TemplateRef<unknown>): void {
    this.appLayoutState.actions.set(actions);
  }

  public clearActions(actions: TemplateRef<unknown>): void {
    // A page entering the view may register its actions before the leaving page clears its own.
    if (this.appLayoutState.actions() === actions) {
      this.appLayoutState.actions.set(null);
    }
  }

  private applyRoute(): void {
    let title = '';
    let search: AppLayoutSearch | null = null;
    let snapshot: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;

    while (snapshot) {
      title = snapshot.title ?? title;
      search = snapshot.data[APP_LAYOUT_SEARCH_DATA_KEY] ?? search;
      snapshot = snapshot.firstChild;
    }

    this.appLayoutState.pageTitle.set(title);
    this.appLayoutState.search.set(search);
    this.appLayoutState.searchQuery.set('');
  }

  private saveSidenav(isExpanded: boolean): void {
    this.browserStorage.setLocalItem(LocalStorageKey.LAYOUT_MENU_OPENED, String(isExpanded));
  }
}
