import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AppLayoutMenuLeftComponent,
  AppLayoutMenuTopComponent,
} from '@birthday/web-layout-ui';
import { AppLayoutComponentAbstract } from '../app-layout';

@Component({
  selector: 'ui-app-layout',
  imports: [AppLayoutMenuLeftComponent, AppLayoutMenuTopComponent],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent extends AppLayoutComponentAbstract {}
