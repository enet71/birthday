import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  CanMatchFn,
  Event,
  Navigation,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  Params,
  PRIMARY_OUTLET,
  Router,
  RouterEvent,
  Routes,
  UrlSegment,
} from '@angular/router';
import { filter, first, map, Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { computed, inject, Signal, Type } from '@angular/core';
import { PlatformService } from '../services';

export const mobileRouteCanMatch: CanMatchFn = (): boolean => {
  const platformService: PlatformService = inject(PlatformService);
  return platformService.isMobile;
};

export function prepareMobileRoutes(
  desktopRoutes: Routes,
  mobileRoutes: Routes,
  baseRoutes: Routes = [],
): Routes {
  return [
    {
      path: '',
      children: mobileRoutes,
      canMatch: [mobileRouteCanMatch],
    },
    {
      path: '',
      children: desktopRoutes,
    },
    ...baseRoutes,
  ];
}

export function getUrlSegments(router: Router): Signal<UrlSegment[]> {
  return computed(() => {
    const navigation: Navigation | null = router.lastSuccessfulNavigation();
    return navigation ? getRouteSegmentsFromNavigation(navigation) : [];
  });
}

export function getRouteSegments(route: ActivatedRoute): string[] {
  return getRouteSegmentsFromSnapshot(route.snapshot.root);
}

export function getRouteSegmentsFromNavigation(
  navigation: Navigation,
): UrlSegment[] {
  return navigation.finalUrl?.root.children?.[PRIMARY_OUTLET].segments ?? [];
}

export function getRouteSegmentsFromSnapshot(
  currentRoute: ActivatedRouteSnapshot | null,
): string[] {
  let segments: string[] = [];

  while (currentRoute) {
    segments = [
      ...segments,
      ...currentRoute.url.map(({ path }: UrlSegment) => path),
    ];
    currentRoute = currentRoute.firstChild;
  }

  return segments;
}

export function getRouteParams(route: ActivatedRoute): Params {
  let currentRoute: ActivatedRouteSnapshot | null = route.snapshot.root;
  let params: Params = {};

  while (currentRoute?.firstChild) {
    currentRoute = currentRoute.firstChild;
    params = {
      ...params,
      ...currentRoute.params,
    };
  }

  return params;
}

export function createRouteParamsSignal(
  router: Router,
  route: ActivatedRoute,
): Signal<Params | undefined> {
  return toSignal(router.events.pipe(map(() => getRouteParams(route))));
}

export function afterNavigate(
  router: Router,
  endEvents: Type<RouterEvent>[] = [
    NavigationEnd,
    NavigationCancel,
    NavigationError,
  ],
): Observable<Event> {
  return router.events.pipe(
    filter((event: Event) =>
      endEvents.some((endEvent) => event instanceof endEvent),
    ),
    first(),
  );
}
