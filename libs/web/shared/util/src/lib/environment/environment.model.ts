export type EnvironmentName = 'local' | 'development' | 'production';

export interface Environment {
  environmentName: EnvironmentName;
  version: string;
  baseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  notificationErrorTime: number;
  notificationSuccessTime: number;
}
