import { InjectionToken } from '@angular/core';
import { AppLayoutConfig } from '../types';

export const APP_LAYOUT_CONFIG: InjectionToken<AppLayoutConfig> =
  new InjectionToken<AppLayoutConfig>('APP_LAYOUT_CONFIG');

// Route `data` key that turns on the top bar search for a route.
export const APP_LAYOUT_SEARCH_DATA_KEY = 'layoutSearch';
