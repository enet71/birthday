import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { APP_LAYOUT_CONFIG, AppLayoutConfig } from '@birthday/web-layout-util';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ui-app-layout-bottom-nav',
  imports: [TranslocoPipe, RouterLink, RouterLinkActive, MatIcon],
  templateUrl: './app-layout-bottom-nav.component.html',
  styleUrl: './app-layout-bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutBottomNavComponent {
  protected readonly config: AppLayoutConfig = inject(APP_LAYOUT_CONFIG);
}
