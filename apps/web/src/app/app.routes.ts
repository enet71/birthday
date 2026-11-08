import { Route } from '@angular/router';
import { APP_DESCRIPTION_DATA_KEY, APP_DOCUMENT_TITLE_DATA_KEY, APP_NOINDEX_DATA_KEY } from './app.constants';

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
    data: { [APP_NOINDEX_DATA_KEY]: true },
    loadChildren: () => import('@birthday/web-birthdays-feature-people').then((m) => m.PEOPLE_ROUTES),
  },
  {
    path: 'settings',
    title: 'Settings',
    data: { [APP_NOINDEX_DATA_KEY]: true },
    loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    // Google Calendar consent returns here; the settings page finishes connecting and moves back to `/settings`.
    path: 'settings/google-calendar',
    title: 'Settings',
    data: { [APP_NOINDEX_DATA_KEY]: true },
    loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'about',
    title: 'About',
    data: {
      [APP_DESCRIPTION_DATA_KEY]:
        'Learn what Birthdly does: a free birthday calendar with month and year views, upcoming birthdays, search, and Google sign-in to sync.',
    },
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'privacy',
    title: 'Privacy Policy',
    data: {
      [APP_DESCRIPTION_DATA_KEY]:
        'How Birthdly collects, uses, and stores your data, including birthdays you add and Google Calendar and Contacts data, and how to delete it.',
    },
    loadComponent: () => import('./pages/legal/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'terms',
    title: 'Terms of Service',
    data: {
      [APP_DESCRIPTION_DATA_KEY]:
        'The terms for using Birthdly, the free birthday calendar: your account, your content, Google Calendar sync, and the limits of the service.',
    },
    loadComponent: () => import('./pages/legal/terms/terms.component').then((m) => m.TermsComponent),
  },
  { path: 'calendar', redirectTo: '' },
  { path: '**', redirectTo: '' },
];
