import { Route } from '@angular/router';
import { APP_LAYOUT_SEARCH_DATA_KEY, AppLayoutSearch } from '@birthday/web-layout-util';

export const appRoutes: Route[] = [
  {
    path: 'calendar',
    title: 'Calendar',
    data: {
      [APP_LAYOUT_SEARCH_DATA_KEY]: {
        placeholder: 'Search people…',
      } satisfies AppLayoutSearch,
    },
    loadChildren: () => import('@birthday/web-birthdays-feature-calendar').then((m) => m.CALENDAR_ROUTES),
  },
  {
    path: 'people',
    title: 'People',
    data: {
      [APP_LAYOUT_SEARCH_DATA_KEY]: {
        placeholder: 'Search people…',
      } satisfies AppLayoutSearch,
    },
    loadComponent: () => import('./pages/people/people.component').then((m) => m.PeopleComponent),
  },
  {
    path: 'settings',
    title: 'Settings',
    loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
  { path: '**', redirectTo: 'calendar' },
];
