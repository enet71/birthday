import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'calendar',
    loadChildren: () =>
      import('@birthday/web-birthdays-feature-calendar').then(
        (m) => m.CALENDAR_ROUTES,
      ),
  },
  {
    path: 'people',
    loadComponent: () =>
      import('./pages/people/people.component').then((m) => m.PeopleComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
  },
  { path: '**', redirectTo: 'calendar' },
];
