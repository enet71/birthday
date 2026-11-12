# web-shared-i18n

Languages of the web app on top of Transloco: the supported locales, the current language (`LocaleState`, `LocaleController`), loading of translations and Angular date data, and the `localeDate` pipe.

Every URL serves every language. The server picks the language from the `locale` cookie, then `Accept-Language`, then English, and renders the page in it. The browser repeats that choice from `<html lang>`, so hydration sees the same texts.
