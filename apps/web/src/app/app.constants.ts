import { AppLayoutConfig } from '@birthday/web-layout-util';

export const APP_LAYOUT: AppLayoutConfig = {
  homePath: '/calendar',
  logo: { src: '/logo.svg', width: 176, height: 32 },
  logoSmall: { src: '/logo-small.svg', width: 32, height: 32 },
  menu: [
    {
      name: 'Calendar',
      path: '/calendar',
      icon: 'calendar_month',
    },
    {
      name: 'People',
      path: '/people',
      icon: 'group',
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: 'settings',
    },
  ],
};
