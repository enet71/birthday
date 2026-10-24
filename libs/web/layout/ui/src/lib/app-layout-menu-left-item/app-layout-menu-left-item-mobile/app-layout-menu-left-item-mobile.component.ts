import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { AppLayoutMenuLeftItem } from '../app-layout-menu-left-item';

@Component({
  selector: 'ui-app-layout-menu-left-item-mobile',
  imports: [MatIcon],
  templateUrl: './app-layout-menu-left-item-mobile.component.html',
  styleUrl: './app-layout-menu-left-item-mobile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutMenuLeftItemMobileComponent extends AppLayoutMenuLeftItem {}
