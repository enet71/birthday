import { Translation } from '@jsverse/transloco';
import { APP_LOCALES } from '../constants';

export type AppLocale = (typeof APP_LOCALES)[number];

export type DateInput = Date | string | number;

// Loads the app's translation file for a language, usually as a lazy `import()` chunk.
export type TranslationFileLoader = (locale: AppLocale) => Promise<Translation>;

export interface I18nOptions {
  loadTranslation: TranslationFileLoader;
}
