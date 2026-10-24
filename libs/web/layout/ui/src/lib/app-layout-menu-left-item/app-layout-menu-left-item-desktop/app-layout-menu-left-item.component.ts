import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { AppLayoutMenuLeftItem } from '../app-layout-menu-left-item';

@Component({
  selector: 'ui-app-layout-menu-left-item',
  imports: [MatIcon, MatMenu, MatMenuItem, MatMenuTrigger],
  templateUrl: './app-layout-menu-left-item.component.html',
  styleUrl: './app-layout-menu-left-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutMenuLeftItemComponent extends AppLayoutMenuLeftItem {
  protected closeMenuItem(): void {
    this.appLayoutController.closeMenuItem();
  }
}
