import { RenderMode, ServerRoute } from '@angular/ssr';

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
  { path: 'people', renderMode: RenderMode.Prerender },
  { path: 'settings', renderMode: RenderMode.Prerender },
  { path: 'settings/google-calendar', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'terms', renderMode: RenderMode.Prerender },
  { path: 'guides', renderMode: RenderMode.Prerender },
  { path: 'guides/google-calendar-birthdays', renderMode: RenderMode.Prerender },
  { path: 'guides/birthday-reminders', renderMode: RenderMode.Prerender },
  { path: 'guides/import-birthdays-from-google-contacts', renderMode: RenderMode.Prerender },
  {
    // Unknown URLs render the not-found page with a real 404, so search engines drop them instead of treating them as the home page.
    path: '**',
    renderMode: RenderMode.Server,
    status: 404,
  },
];
