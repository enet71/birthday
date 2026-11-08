import { Route } from '@angular/router';
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
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'privacy',
    title: 'Privacy Policy',
    loadComponent: () => import('./pages/legal/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'terms',
    title: 'Terms of Service',
    loadComponent: () => import('./pages/legal/terms/terms.component').then((m) => m.TermsComponent),
  },
  { path: 'calendar', redirectTo: '' },
  { path: '**', redirectTo: '' },
];
