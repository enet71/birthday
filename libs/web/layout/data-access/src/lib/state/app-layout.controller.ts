import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { AppLayoutState } from './app-layout.state';
import { Router } from '@angular/router';
import {
  BrowserStorageService,
  LocalStorageKey,
} from '@birthday/web-shared-util';
import { AppLayoutMenuItem, Breadcrumb } from '@birthday/web-layout-util';

@Injectable({ providedIn: 'root' })
export class AppLayoutController {
  private readonly appLayoutState: AppLayoutState = inject(AppLayoutState);
  private readonly router: Router = inject(Router);
  private readonly browserStorage: BrowserStorageService = inject(
    BrowserStorageService,
  );
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    this.setLeftMenuOpen();
  }

  public closeMenuItem(): void {
    this.appLayoutState.openedMenuItem.set(null);
  }

  public selectMenuItem(item: AppLayoutMenuItem): void {
    this.closeMenuItem();

    if (item.children) {
      this.appLayoutState.openedMenuItem.set(item);
    }

    if (!item.path) {
      return;
    }

    this.router.navigateByUrl(item.path);
  }

  public toggleLeftMenuOpen(): void {
    this.appLayoutState.isLeftMenuOpened.update((value: boolean) => !value);
    this.browserStorage.setLocalItem(
      LocalStorageKey.LAYOUT_MENU_OPENED,
      JSON.stringify(this.appLayoutState.isLeftMenuOpened()),
    );
  }

  public setBreadcrumbs(breadcrumbs: Breadcrumb[]): void {
    this.appLayoutState.breadcrumbs.set(breadcrumbs);
  }

  private setLeftMenuOpen(): void {
    const isLeftMenuOpened: string | null = this.browserStorage.getLocalItem(
      LocalStorageKey.LAYOUT_MENU_OPENED,
    );

    if (isLeftMenuOpened) {
      this.appLayoutState.isLeftMenuOpened.set(JSON.parse(isLeftMenuOpened));
    } else {
      this.appLayoutState.isLeftMenuOpened.set(
        this.isBrowser && window.innerWidth > 1600,
      );
    }
  }
}
