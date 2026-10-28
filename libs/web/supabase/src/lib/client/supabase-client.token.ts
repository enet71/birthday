import { InjectionToken } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types';

export type SupabaseDatabaseClient = SupabaseClient<Database>;

export const SUPABASE_CLIENT: InjectionToken<SupabaseDatabaseClient> = new InjectionToken<SupabaseDatabaseClient>('supabase-client');
