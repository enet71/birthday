import { InjectionToken } from '@angular/core';
import { Environment } from './environment.model';

export const ENVIRONMENT_TOKEN: InjectionToken<Environment> =
  new InjectionToken<Environment>('environment');
