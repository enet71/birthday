export type EnvironmentName = 'local' | 'development' | 'production';

export interface Environment {
  environmentName: EnvironmentName;
  version: string;
  baseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  // The public VAPID key of birthday push notifications (`npm run push:vapid-keys`), base64url.
  vapidPublicKey: string;
  notificationErrorTime: number;
  notificationSuccessTime: number;
}
