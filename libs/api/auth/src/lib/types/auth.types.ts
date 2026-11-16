import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthModuleOptions {
  // The project URL, for example `https://<ref>.supabase.co`, or `http://127.0.0.1:54321` locally.
  supabaseUrl: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
