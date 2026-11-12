import { EnvironmentProviders, inject, isDevMode, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { APP_DEFAULT_LOCALE, APP_LOCALES } from '../constants';
import { AppTranslocoLoader } from '../services';
import { LocaleController } from '../state';
import { I18N_OPTIONS } from '../tokens';
import { I18nOptions } from '../types';

export function provideI18n(options: I18nOptions): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: I18N_OPTIONS, useValue: options },
    provideTransloco({
      config: {
        availableLangs: [...APP_LOCALES],
        defaultLang: APP_DEFAULT_LOCALE,
        // A key missing from a translation shows its English text instead of the key.
        fallbackLang: APP_DEFAULT_LOCALE,
        missingHandler: { useFallbackTranslation: true, logMissingKey: isDevMode() },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: AppTranslocoLoader,
    }),
    provideAppInitializer(() => inject(LocaleController).init()),
  ]);
}
