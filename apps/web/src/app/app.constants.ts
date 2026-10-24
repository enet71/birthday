import { AppLayoutConfig } from '@birthday/web-layout-util';

export const APP_LAYOUT: AppLayoutConfig = {
  appName: 'Birthday Planner',
  homePath: '/calendar',
  logo: { src: '/logo.svg', width: 176, height: 32 },
  logoSmall: { src: '/logo-small.svg', width: 32, height: 32 },
  menu: [
    {
      label: 'Calendar',
      path: '/calendar',
      icon: 'calendar_month',
    },
    {
      label: 'People',
      path: '/people',
      icon: 'group',
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: 'settings',
    },
  ],
};
