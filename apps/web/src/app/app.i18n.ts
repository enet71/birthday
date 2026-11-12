import { Translation } from '@jsverse/transloco';
import { AppLocale } from '@birthday/web-shared-i18n';

interface TranslationModule {
  default: Translation;
}

// Each language is a lazy chunk that the server and the browser load the same way, without an HTTP request.
const TRANSLATION_LOADERS: Record<AppLocale, () => Promise<TranslationModule>> = {
  en: () => import('../i18n/en.json'),
  es: () => import('../i18n/es.json'),
  de: () => import('../i18n/de.json'),
  fr: () => import('../i18n/fr.json'),
  ru: () => import('../i18n/ru.json'),
  uk: () => import('../i18n/uk.json'),
};

export async function loadAppTranslation(locale: AppLocale): Promise<Translation> {
  const translationModule: TranslationModule = await TRANSLATION_LOADERS[locale]();

  return translationModule.default;
}
