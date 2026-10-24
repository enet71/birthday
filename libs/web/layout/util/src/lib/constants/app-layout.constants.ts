import { InjectionToken } from '@angular/core';
import { AppLayoutConfig } from '../types';

export const APP_LAYOUT_CONFIG: InjectionToken<AppLayoutConfig> =
  new InjectionToken<AppLayoutConfig>('APP_LAYOUT_CONFIG');
