export type EnvironmentName = 'local' | 'development' | 'production';

export interface Environment {
  environmentName: EnvironmentName;
  version: string;
  baseUrl: string;
  notificationErrorTime: number;
  notificationSuccessTime: number;
}
