// The app's languages: the web app's translations, and the languages of notification texts. The database checks
// notification_settings.locale against the same list.
export const APP_LOCALES = ['en', 'es', 'de', 'fr', 'ru', 'uk'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];
