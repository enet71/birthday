import { ChangeDetectionStrategy, Component, Signal } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { AppLayoutState } from '@birthday/web-layout-data-access';
import { AppLayoutBottomNavComponent, AppLayoutSidenavComponent, AppLayoutTopBarComponent } from '@birthday/web-layout-ui';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ui-app-layout',
  imports: [TranslocoPipe, MatProgressBar, AppLayoutBottomNavComponent, AppLayoutSidenavComponent, AppLayoutTopBarComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  private readonly appLayoutState: ReadonlyState<AppLayoutState> = injectState(AppLayoutState);

  protected get isLoading(): Signal<boolean> {
    return this.appLayoutState.isLoading;
  }
}
