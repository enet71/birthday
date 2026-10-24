import {
  ChangeDetectionStrategy,
  Component,
  output,
  OutputEmitterRef,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AppLayoutMenuLeftItemMobileComponent } from '../../app-layout-menu-left-item';
import { AppLayoutMenuLeft } from '../app-layout-menu-left';

@Component({
  selector: 'ui-app-layout-menu-left-mobile',
  imports: [MatIcon, MatIconButton, AppLayoutMenuLeftItemMobileComponent],
  templateUrl: './app-layout-menu-left-mobile.component.html',
  styleUrls: ['./app-layout-menu-left-mobile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutMenuLeftMobileComponent extends AppLayoutMenuLeft {
  public closed: OutputEmitterRef<void> = output();

  protected closeMenu(): void {
    this.closed.emit();
  }
}
