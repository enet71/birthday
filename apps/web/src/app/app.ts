import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  AppLayoutComponent,
  AppLayoutMobileComponent,
} from '@birthday/web-layout-shell';
import { PlatformService } from '@birthday/web-shared-util';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppLayoutComponent, AppLayoutMobileComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly isMobile: boolean =
    isPlatformBrowser(inject(PLATFORM_ID)) && inject(PlatformService).isMobile;
}
