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
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
