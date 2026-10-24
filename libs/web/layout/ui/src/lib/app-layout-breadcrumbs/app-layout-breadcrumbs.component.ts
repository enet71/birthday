import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
  Signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { AppLayoutState } from '@birthday/web-layout-data-access';
import { Breadcrumb } from '@birthday/web-layout-util';
import { ReadonlyState, injectState } from '@birthday/web-shared-data-access';

@Component({
  selector: 'ui-app-layout-breadcrumbs',
  imports: [MatIcon],
  templateUrl: './app-layout-breadcrumbs.component.html',
  styleUrl: './app-layout-breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutBreadcrumbsComponent {
  private appLayoutState: ReadonlyState<AppLayoutState> =
    injectState(AppLayoutState);
  private injector: Injector = inject(Injector);

  protected get breadcrumbs(): Signal<Breadcrumb[]> {
    return this.appLayoutState.breadcrumbs;
  }

  protected navigate(breadcrumb: Breadcrumb): void {
    breadcrumb.navigate?.(this.injector);
  }
}
