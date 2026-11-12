import { CALENDAR_ADD_BIRTHDAY_QUERY_PARAM } from '@birthday/web-birthdays-util';
import { AppLayoutConfig } from '@birthday/web-layout-util';
import { AppLocale } from '@birthday/web-shared-i18n';

export const APP_SITE_URL = 'https://birthdly.com';

// Route data flag that keeps a page with private, user-only content out of search results.
export const APP_NOINDEX_DATA_KEY = 'noindex';

// Route data with a full document title that replaces the default "<route title> · <app name>".
export const APP_DOCUMENT_TITLE_DATA_KEY = 'documentTitle';

// Route data with an `AppStructuredDataFactory` whose schema.org object the page adds to the document head as JSON-LD.
export const APP_STRUCTURED_DATA_DATA_KEY = 'structuredData';

// Route data with the page's meta description; pages without one use `APP_DEFAULT_DESCRIPTION`.
export const APP_DESCRIPTION_DATA_KEY = 'description';

// Translation key of the description for pages without their own; its English text matches the description tags in `index.html`.
export const APP_DEFAULT_DESCRIPTION = 'app.description';

export const APP_OPEN_GRAPH_LOCALES: Record<AppLocale, string> = {
  en: 'en_US',
  es: 'es_ES',
  de: 'de_DE',
  fr: 'fr_FR',
  ru: 'ru_RU',
  uk: 'uk_UA',
};

// Labels are translation keys; the layout translates them.
export const APP_LAYOUT: AppLayoutConfig = {
  appName: 'Birthdly',
  homePath: '/',
  logo: { src: '/assets/images/logo-1.svg', width: 124, height: 40 },
  logoSmall: { src: '/assets/images/logo-2.svg', width: 41, height: 40 },
  menu: [
    {
      label: 'nav.calendar',
      path: '/',
      icon: 'calendar_month',
    },
    {
      label: 'nav.people',
      path: '/people',
      icon: 'group',
    },
    {
      label: 'nav.settings',
      path: '/settings',
      icon: 'settings',
    },
  ],
  primaryAction: {
    label: 'nav.addBirthday',
    icon: 'add',
    path: '/',
    queryParams: { [CALENDAR_ADD_BIRTHDAY_QUERY_PARAM]: '1' },
  },
  // Google OAuth branding requires the app name and the legal links on the home page.
  footer: {
    tagline: 'footer.tagline',
    links: [
      { label: 'footer.about', path: '/about' },
      { label: 'footer.guides', path: '/guides' },
      { label: 'footer.privacy', path: '/privacy' },
      { label: 'footer.terms', path: '/terms' },
    ],
  },
};
