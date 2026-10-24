import { Directive, HostBinding, inject, Signal } from '@angular/core';
import {
  AppLayoutController,
  AppLayoutState,
} from '@birthday/web-layout-data-access';
import { APP_LAYOUT_CONFIG, AppLayoutConfig } from '@birthday/web-layout-util';
import { ReadonlyState, injectState } from '@birthday/web-shared-data-access';

@Directive()
export class AppLayoutMenuLeft {
  protected readonly config: AppLayoutConfig = inject(APP_LAYOUT_CONFIG);

  private readonly appLayoutController: AppLayoutController =
    inject(AppLayoutController);
  private readonly appLayoutState: ReadonlyState<AppLayoutState> =
    injectState(AppLayoutState);

  @HostBinding('class.layout-menu-left-opened')
  public get classOpened(): boolean {
    return this.isOpened();
  }

  protected get isOpened(): Signal<boolean> {
    return this.appLayoutState.isLeftMenuOpened;
  }

  protected toggleOpen(): void {
    this.appLayoutController.toggleLeftMenuOpen();
  }
}
