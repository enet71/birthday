import { Route } from '@angular/router';
import { APP_LAYOUT_SEARCH_DATA_KEY, AppLayoutSearch } from '@birthday/web-layout-util';
import { APP_DOCUMENT_TITLE_DATA_KEY, APP_NOINDEX_DATA_KEY } from './app.constants';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Calendar',
    data: { [APP_DOCUMENT_TITLE_DATA_KEY]: 'Birthdly — birthday calendar' },
    loadChildren: () => import('@birthday/web-birthdays-feature-calendar').then((m) => m.CALENDAR_ROUTES),
  },
  {
    path: 'people',
    title: 'People',
    data: {
      [APP_LAYOUT_SEARCH_DATA_KEY]: {
        placeholder: 'Search people…',
      } satisfies AppLayoutSearch,
      [APP_NOINDEX_DATA_KEY]: true,
    },
    loadComponent: () => import('./pages/people/people.component').then((m) => m.PeopleComponent),
  },
  {
    path: 'settings',
    title: 'Settings',
    data: { [APP_NOINDEX_DATA_KEY]: true },
    loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'about',
    title: 'About',
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
  },
  { path: 'calendar', redirectTo: '' },
  { path: '**', redirectTo: '' },
];
