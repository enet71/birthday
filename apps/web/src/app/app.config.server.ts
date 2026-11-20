import { PlatformLocation } from '@angular/common';
import { mergeApplicationConfig, ApplicationConfig, inject, Provider } from '@angular/core';
import { FetchBackend, HttpBackend } from '@angular/common/http';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { AppInternalApiBackend } from './app-internal-api.backend';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

// Set in production (`deploy/compose.yml`); locally the dev server's proxy forwards `/api` instead.
const apiInternalUrl: string | undefined = process.env['API_INTERNAL_URL'];

const internalApiProviders: Provider[] = apiInternalUrl
  ? [
      {
        provide: HttpBackend,
        useFactory: () => new AppInternalApiBackend(inject(FetchBackend), apiInternalUrl, getPageOrigin(inject(PlatformLocation))),
      },
    ]
  : [];

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes)), ...internalApiProviders],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

// The origin Angular's server platform resolves relative URLs against.
function getPageOrigin({ protocol, hostname, port }: PlatformLocation): string {
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
}
