import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatListItem,
  MatListItemIcon,
  MatListItemTitle,
  MatNavList,
} from '@angular/material/list';
import {
  AppLayoutController,
  AppLayoutState,
} from '@birthday/web-layout-data-access';
import { APP_LAYOUT_CONFIG, AppLayoutConfig } from '@birthday/web-layout-util';
import { ReadonlyState, injectState } from '@birthday/web-shared-data-access';

@Component({
  selector: 'ui-app-layout-sidenav',
  imports: [
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    MatIconButton,
    MatIcon,
    MatNavList,
    MatListItem,
    MatListItemIcon,
    MatListItemTitle,
  ],
  templateUrl: './app-layout-sidenav.component.html',
  styleUrl: './app-layout-sidenav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.collapsed]': '!isExpanded()',
    '[class.animated]': 'isAnimated()',
  },
})
export class AppLayoutSidenavComponent {
  protected readonly config: AppLayoutConfig = inject(APP_LAYOUT_CONFIG);
  // Width is animated only for user toggles, so restoring the saved state on load is instant.
  protected readonly isAnimated: WritableSignal<boolean> = signal(false);

  private readonly appLayoutState: ReadonlyState<AppLayoutState> =
    injectState(AppLayoutState);
  private readonly appLayoutController: AppLayoutController =
    inject(AppLayoutController);

  protected get isExpanded(): Signal<boolean> {
    return this.appLayoutState.isSidenavExpanded;
  }

  protected toggle(): void {
    this.isAnimated.set(true);
    this.appLayoutController.toggleSidenav();
  }
}
