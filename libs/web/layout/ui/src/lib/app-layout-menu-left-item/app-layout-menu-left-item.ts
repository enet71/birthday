import {
  Directive,
  HostBinding,
  inject,
  input,
  InputSignal,
  Signal,
} from '@angular/core';
import {
  AppLayoutController,
  AppLayoutState,
} from '@birthday/web-layout-data-access';
import { AppLayoutMenuItem } from '@birthday/web-layout-util';
import { ReadonlyState, injectState } from '@birthday/web-shared-data-access';

@Directive()
export class AppLayoutMenuLeftItem {
  public item: InputSignal<AppLayoutMenuItem> = input.required();

  protected readonly appLayoutState: ReadonlyState<AppLayoutState> =
    injectState(AppLayoutState);
  protected readonly appLayoutController: AppLayoutController =
    inject(AppLayoutController);

  @HostBinding('class.selected') public get classSelected(): boolean {
    return this.isItemSelected(this.item());
  }

  @HostBinding('class.opened') public get classOpened(): boolean {
    return this.isOpened();
  }

  protected get isOpened(): Signal<boolean> {
    return this.appLayoutState.isLeftMenuOpened;
  }

  protected get menuOpened(): boolean {
    return this.appLayoutState.openedMenuItem() === this.item();
  }

  protected isItemSelected(item: AppLayoutMenuItem): boolean {
    return this.appLayoutState.isItemSelected(item)();
  }

  protected selectItem(item: AppLayoutMenuItem): void {
    this.appLayoutController.selectMenuItem(item);
  }
}
