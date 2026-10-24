import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { AppLayoutMenuLeftItemComponent } from '../../app-layout-menu-left-item';
import { AppLayoutMenuLeft } from '../app-layout-menu-left';

@Component({
  selector: 'ui-app-layout-menu-left',
  imports: [NgOptimizedImage, AppLayoutMenuLeftItemComponent, MatIcon],
  templateUrl: './app-layout-menu-left.component.html',
  styleUrl: './app-layout-menu-left.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutMenuLeftComponent extends AppLayoutMenuLeft {}
