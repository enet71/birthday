import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { AppLayoutController } from '../state';
import { Breadcrumb } from '@birthday/web-layout-util';

export function breadcrumbsResolver(
  breadcrumbs: Breadcrumb[],
): ResolveFn<null> {
  return () => {
    const appLayoutController: AppLayoutController =
      inject(AppLayoutController);
    appLayoutController.setBreadcrumbs(breadcrumbs);
    return null;
  };
}
