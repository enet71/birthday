import { DOCUMENT, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, fromEvent, interval, merge, switchMap, EMPTY } from 'rxjs';
import { StateController } from '@birthday/web-shared-data-access';
import { PlatformService } from '@birthday/web-shared-util';
import { ADMIN_IMPORTS_REFRESH_MS } from '../constants';
import { AdminImportsState } from './admin-imports.state';

@Injectable()
export class AdminImportsController extends StateController {
  private readonly adminImportsState: AdminImportsState = inject(AdminImportsState);
  private readonly document: Document = inject(DOCUMENT);

  constructor() {
    super();
    // In the browser, while the tab is visible: every 10 seconds, and at once when the tab becomes visible again.
    toObservable(inject(PlatformService).isRendered)
      .pipe(
        switchMap((isRendered: boolean) =>
          isRendered ? merge(interval(ADMIN_IMPORTS_REFRESH_MS), fromEvent(this.document, 'visibilitychange')) : EMPTY,
        ),
        filter(() => this.document.visibilityState === 'visible'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refresh());
  }

  // Also retries a failed load. A refresh still loading, a non-admin and a signed-out visitor need none.
  public refresh(): void {
    if (!this.adminImportsState.isRefreshing() && !this.adminImportsState.isNotFound()) {
      this.adminImportsState.statusResource.reload();
    }
  }
}
