export const APP_LOCALES = ['en', 'es', 'de', 'fr', 'ru', 'uk'] as const;

export const APP_DEFAULT_LOCALE = 'en';

// Remembers the visitor's language, so the server renders pages in it.
export const APP_LOCALE_COOKIE = 'locale';

export const APP_LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// 0 is Sunday and 1 is Monday, as in `Date.getDay()`; the US starts the week on Sunday, the other languages' main regions on Monday.
export const APP_LOCALE_FIRST_DAY_OF_WEEK: Record<(typeof APP_LOCALES)[number], 0 | 1> = {
  en: 0,
  es: 1,
  de: 1,
  fr: 1,
  ru: 1,
  uk: 1,
};

// Each language is named in itself, so a visitor finds theirs whatever the current language is.
export const APP_LOCALE_NAMES: Record<(typeof APP_LOCALES)[number], string> = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  ru: 'Русский',
  uk: 'Українська',
};
