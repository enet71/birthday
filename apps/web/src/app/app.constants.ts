import { CALENDAR_ADD_BIRTHDAY_QUERY_PARAM } from '@birthday/web-birthdays-util';
import { AppLayoutConfig } from '@birthday/web-layout-util';
import { AppLocale } from '@birthday/web-shared-i18n';
import { AppTheme, AppThemePreference } from './app.interfaces';

export const APP_SITE_URL = 'https://birthdly.com';

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
      label: 'nav.celebrities',
      path: '/born',
      icon: 'star',
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

// Also used by the inline script in `index.html`.
export const APP_DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export const APP_THEME_PREFERENCES: readonly AppThemePreference[] = ['system', 'light', 'dark'];

// Browser UI color per theme: the canvas color. The inline script in `index.html` repeats these values.
export const APP_THEME_COLORS: Record<AppTheme, string> = {
  light: '#fdf8ff',
  dark: '#0c0e1b',
};
