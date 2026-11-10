import { CALENDAR_ADD_BIRTHDAY_QUERY_PARAM } from '@birthday/web-birthdays-util';
import { AppLayoutConfig } from '@birthday/web-layout-util';

export const APP_SITE_URL = 'https://birthdly.com';

// Route data flag that keeps a page with private, user-only content out of search results.
export const APP_NOINDEX_DATA_KEY = 'noindex';

// Route data with a full document title that replaces the default "<route title> · <app name>".
export const APP_DOCUMENT_TITLE_DATA_KEY = 'documentTitle';

// Route data with a schema.org object that the page adds to the document head as JSON-LD.
export const APP_STRUCTURED_DATA_DATA_KEY = 'structuredData';

// Route data with the page's meta description; pages without one use `APP_DEFAULT_DESCRIPTION`.
export const APP_DESCRIPTION_DATA_KEY = 'description';

// Keep in sync with the description tags in `index.html`.
export const APP_DEFAULT_DESCRIPTION =
  "Birthdly is a birthday calendar and reminder app. Keep track of friends' and family birthdays, see upcoming ones at a glance, and never miss a celebration.";

export const APP_LAYOUT: AppLayoutConfig = {
  appName: 'Birthdly',
  homePath: '/',
  logo: { src: '/assets/images/logo-1.svg', width: 124, height: 40 },
  logoSmall: { src: '/assets/images/logo-2.svg', width: 41, height: 40 },
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
  primaryAction: {
    label: 'Add birthday',
    icon: 'add',
    path: '/',
    queryParams: { [CALENDAR_ADD_BIRTHDAY_QUERY_PARAM]: '1' },
  },
  // Google OAuth branding requires the app name and the legal links on the home page.
  footer: {
    tagline: 'birthday calendar',
    links: [
      { label: 'About', path: '/about' },
      { label: 'Privacy Policy', path: '/privacy' },
      { label: 'Terms of Service', path: '/terms' },
    ],
  },
};
