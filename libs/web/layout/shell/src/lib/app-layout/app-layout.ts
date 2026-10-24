import { Directive, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_LAYOUT_CONFIG, AppLayoutConfig } from '@birthday/web-layout-util';

@Directive()
export abstract class AppLayoutComponentAbstract {
  protected readonly config: AppLayoutConfig = inject(APP_LAYOUT_CONFIG);
  protected readonly router: Router = inject(Router);

  protected openMainPage(): void {
    this.router.navigateByUrl(this.config.homePath);
  }
}
