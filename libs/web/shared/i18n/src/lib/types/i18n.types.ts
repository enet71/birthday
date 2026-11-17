import { Translation } from '@jsverse/transloco';
import type { AppLocale } from '@birthday/shared-models';

// Shared with the API, which validates the language of notifications.
export type { AppLocale };

export type DateInput = Date | string | number;

// Loads the app's translation file for a language, usually as a lazy `import()` chunk.
export type TranslationFileLoader = (locale: AppLocale) => Promise<Translation>;

export interface I18nOptions {
  loadTranslation: TranslationFileLoader;
}
