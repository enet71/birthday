import { RenderMode, ServerRoute } from '@angular/ssr';

// Every page renders on the server for each request, because its language comes from the request (see `LocaleController`).
export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    // The calendar used to live here; a permanent redirect moves its search ranking to the home page.
    path: 'calendar',
    renderMode: RenderMode.Server,
    status: 301,
  },
  { path: 'people', renderMode: RenderMode.Server },
  { path: 'settings', renderMode: RenderMode.Server },
  { path: 'settings/google-calendar', renderMode: RenderMode.Server },
  { path: 'about', renderMode: RenderMode.Server },
  { path: 'privacy', renderMode: RenderMode.Server },
  { path: 'terms', renderMode: RenderMode.Server },
  { path: 'guides', renderMode: RenderMode.Server },
  { path: 'guides/google-calendar-birthdays', renderMode: RenderMode.Server },
  { path: 'guides/birthday-reminders', renderMode: RenderMode.Server },
  { path: 'guides/import-birthdays-from-google-contacts', renderMode: RenderMode.Server },
  {
    // Unknown URLs render the not-found page with a real 404, so search engines drop them instead of treating them as the home page.
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
  },
];
