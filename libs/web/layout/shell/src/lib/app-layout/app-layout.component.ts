import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AppLayoutBottomNavComponent,
  AppLayoutSidenavComponent,
  AppLayoutTopBarComponent,
} from '@birthday/web-layout-ui';

@Component({
  selector: 'ui-app-layout',
  imports: [
    AppLayoutBottomNavComponent,
    AppLayoutSidenavComponent,
    AppLayoutTopBarComponent,
  ],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {}
