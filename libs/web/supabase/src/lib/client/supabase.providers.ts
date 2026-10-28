import { EnvironmentProviders, inject, makeEnvironmentProviders, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { createClient } from '@supabase/supabase-js';
import { Environment, ENVIRONMENT_TOKEN } from '@birthday/web-shared-util';
import { Database } from '../types';
import { SUPABASE_CLIENT, SupabaseDatabaseClient } from './supabase-client.token';

export function provideSupabase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SUPABASE_CLIENT,
      useFactory: (): SupabaseDatabaseClient => {
        const environment: Environment = inject(ENVIRONMENT_TOKEN);
        // The session lives in the browser's localStorage, so the server renders as a signed-out user.
        const isServer: boolean = isPlatformServer(inject(PLATFORM_ID));

        return createClient<Database>(environment.supabaseUrl, environment.supabasePublishableKey, {
          auth: {
            flowType: 'pkce',
            persistSession: !isServer,
            autoRefreshToken: !isServer,
            detectSessionInUrl: !isServer,
          },
        });
      },
    },
  ]);
}
