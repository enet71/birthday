import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_LAYOUT_CONFIG, AppLayoutConfig } from '@birthday/web-layout-util';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ui-app-layout-footer',
  imports: [TranslocoPipe, RouterLink],
  templateUrl: './app-layout-footer.component.html',
  styleUrl: './app-layout-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutFooterComponent {
  protected readonly config: AppLayoutConfig = inject(APP_LAYOUT_CONFIG);
}
