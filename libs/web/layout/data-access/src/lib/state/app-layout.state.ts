import {
  computed,
  inject,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { Event as RouterEvent, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppLayoutMenuItem, Breadcrumb } from '@birthday/web-layout-util';

@Injectable({ providedIn: 'root' })
export class AppLayoutState {
  public readonly openedMenuItem: WritableSignal<AppLayoutMenuItem | null> =
    signal(null);
  public readonly isLeftMenuOpened: WritableSignal<boolean> = signal(true);
  public readonly breadcrumbs: WritableSignal<Breadcrumb[]> = signal([]);

  private readonly router: Router = inject(Router);
  private readonly navigationEndEvent: Signal<NavigationEnd | undefined> =
    toSignal(
      this.router.events.pipe(
        filter(
          (event: RouterEvent): event is NavigationEnd =>
            event instanceof NavigationEnd,
        ),
      ),
    );

  public isItemSelected(item: AppLayoutMenuItem): Signal<boolean> {
    return computed(() => {
      this.navigationEndEvent();

      if (item.children) {
        return item.children.some((child: AppLayoutMenuItem) =>
          this.isItemSelected(child)(),
        );
      } else if (item.path) {
        return this.router.isActive(item.path, {
          matrixParams: 'ignored',
          queryParams: 'ignored',
          paths: 'subset',
          fragment: 'ignored',
        });
      }

      return false;
    });
  }
}
