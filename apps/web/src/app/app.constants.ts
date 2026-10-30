import { AppLayoutConfig } from '@birthday/web-layout-util';

export const APP_SITE_URL = 'https://birthdly.com';

// Route data flag that keeps a page with private, user-only content out of search results.
export const APP_NOINDEX_DATA_KEY = 'noindex';

// Route data with a full document title that replaces the default "<route title> · <app name>".
export const APP_DOCUMENT_TITLE_DATA_KEY = 'documentTitle';

export const APP_LAYOUT: AppLayoutConfig = {
  appName: 'Birthdly',
  homePath: '/',
  logo: { src: '/logo.svg', width: 112, height: 32 },
  logoSmall: { src: '/logo-small.svg', width: 32, height: 32 },
  menu: [
    {
      label: 'Calendar',
      path: '/',
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
