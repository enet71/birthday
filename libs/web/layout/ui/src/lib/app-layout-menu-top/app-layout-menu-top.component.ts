import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'ui-app-layout-menu-top',
  imports: [MatIcon],
  templateUrl: './app-layout-menu-top.component.html',
  styleUrl: './app-layout-menu-top.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutMenuTopComponent {}
