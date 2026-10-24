import {
  ChangeDetectionStrategy,
  Component,
  signal,
  WritableSignal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AppLayoutMenuLeftMobileComponent } from '@birthday/web-layout-ui';
import { AppLayoutComponentAbstract } from '../app-layout';

@Component({
  selector: 'ui-app-layout-mobile',
  imports: [
    MatIcon,
    MatIconButton,
    AppLayoutMenuLeftMobileComponent,
    NgOptimizedImage,
  ],
  templateUrl: './app-layout-mobile.component.html',
  styleUrls: ['./app-layout-mobile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutMobileComponent extends AppLayoutComponentAbstract {
  protected readonly isMenuOpen: WritableSignal<boolean> = signal(false);

  protected openMenu(): void {
    this.isMenuOpen.set(true);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
