import { Route } from '@angular/router';
import { APP_LAYOUT_HEADING_DATA_KEY } from '@birthday/web-layout-util';
import { APP_DESCRIPTION_DATA_KEY, APP_DOCUMENT_TITLE_DATA_KEY, APP_NOINDEX_DATA_KEY, APP_STRUCTURED_DATA_DATA_KEY } from './app.constants';
import { buildAboutFaqStructuredData } from './pages/about/about.helpers';

// Titles, headings, and descriptions are translation keys; `AppPageMetaStrategy` and the layout translate them.
export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'routes.calendar.title',
    data: {
      [APP_DOCUMENT_TITLE_DATA_KEY]: 'routes.calendar.documentTitle',
      [APP_LAYOUT_HEADING_DATA_KEY]: 'routes.calendar.heading',
    },
    loadChildren: () => import('@birthday/web-birthdays-feature-calendar').then((m) => m.CALENDAR_ROUTES),
  },
  {
    path: 'people',
    title: 'routes.people.title',
    data: { [APP_NOINDEX_DATA_KEY]: true },
    loadChildren: () => import('@birthday/web-birthdays-feature-people').then((m) => m.PEOPLE_ROUTES),
  },
  {
    path: 'settings',
    title: 'routes.settings.title',
    data: { [APP_NOINDEX_DATA_KEY]: true },
    loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    // Google Calendar consent returns here; the settings page finishes connecting and moves back to `/settings`.
    path: 'settings/google-calendar',
    title: 'routes.settings.title',
    data: { [APP_NOINDEX_DATA_KEY]: true },
    loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'about',
    title: 'routes.about.title',
    data: {
      [APP_DOCUMENT_TITLE_DATA_KEY]: 'routes.about.documentTitle',
      [APP_LAYOUT_HEADING_DATA_KEY]: 'routes.about.heading',
      [APP_DESCRIPTION_DATA_KEY]: 'routes.about.description',
      [APP_STRUCTURED_DATA_DATA_KEY]: buildAboutFaqStructuredData,
    },
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'privacy',
    title: 'routes.privacy.title',
    data: {
      [APP_DESCRIPTION_DATA_KEY]: 'routes.privacy.description',
    },
    loadComponent: () => import('./pages/legal/privacy/privacy.component').then((m) => m.PrivacyComponent),
  },
  {
    path: 'terms',
    title: 'routes.terms.title',
    data: {
      [APP_DESCRIPTION_DATA_KEY]: 'routes.terms.description',
    },
    loadComponent: () => import('./pages/legal/terms/terms.component').then((m) => m.TermsComponent),
  },
  { path: 'calendar', redirectTo: '' },
  {
    path: 'guides',
    loadChildren: () => import('./pages/guides/guides.routes').then((m) => m.GUIDES_ROUTES),
  },
  {
    path: '**',
    title: 'routes.notFound.title',
    data: { [APP_NOINDEX_DATA_KEY]: true },
    loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
