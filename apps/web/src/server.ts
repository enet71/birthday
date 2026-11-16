import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_SITE_URL } from './app/app.constants';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const wwwHostname = `www.${new URL(APP_SITE_URL).hostname}`;

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Moves the `www` copy of the site to the main domain, so search engines index one address per page.
 * Behind the App Platform router the visitor's host may arrive in `X-Forwarded-Host`, so both headers are checked.
 * The target is fixed, so a forged header can only redirect its own sender to the main domain; `private` keeps shared caches
 * from serving that answer to everyone else under the main domain's URL.
 */
app.use((req, res, next) => {
  if (![req.get('x-forwarded-host'), req.get('host')].some(isWwwHost)) {
    next();
    return;
  }

  res.set('Cache-Control', 'private');

  // A service worker installed on `www` cannot follow a cross-origin redirect of its manifest and would stay forever;
  // a missing manifest makes the Angular service worker unregister itself.
  if (req.path === '/ngsw.json') {
    res.sendStatus(404);
    return;
  }

  res.redirect(301, `${APP_SITE_URL}${req.originalUrl}`);
});

// `www.birthdly.com:443` and `www.birthdly.com, proxy` → `www.birthdly.com`.
function isWwwHost(header: string | undefined): boolean {
  return header?.split(',')[0].trim().split(':')[0].toLowerCase() === wwwHostname;
}

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      // Root public files (robots.txt, sitemap.xml, manifest, icons) keep fixed names, so caches must revalidate them.
      if (dirname(filePath) === browserDistFolder && !/\.(js|css)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  // Pages render in the language from the `locale` cookie or `Accept-Language`, so caches must keep one copy per language.
  res.vary('Cookie').vary('Accept-Language');
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  const server = app.listen(port, async (error?: Error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
    // Set when Nx waits for this server to be ready
    if (process.env['NX_READY_SIGNAL_SOCKET']) {
      try {
        // Function keeps TypeScript and bundlers from rewriting or bundling the import
        const load = new Function('s', 'return import(s)') as (s: string) => Promise<{ emitReadySignal(server: unknown): boolean }>;
        (await load('@nx/js/ready-signal')).emitReadySignal(server);
      } catch {
        // @nx/js isn't installed
      }
    }
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
