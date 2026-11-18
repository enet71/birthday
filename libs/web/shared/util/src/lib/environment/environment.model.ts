export type EnvironmentName = 'local' | 'development' | 'production';

export interface Environment {
  environmentName: EnvironmentName;
  version: string;
  baseUrl: string;
  // The public VAPID key of birthday push notifications (`npm run push:vapid-keys`), base64url.
  vapidPublicKey: string;
  notificationErrorTime: number;
  notificationSuccessTime: number;
}
