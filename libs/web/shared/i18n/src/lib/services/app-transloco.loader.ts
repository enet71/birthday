import { registerLocaleData } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { from, map, Observable } from 'rxjs';
import { APP_DEFAULT_LOCALE } from '../constants';
import { isAppLocale } from '../helpers';
import { I18N_OPTIONS } from '../tokens';
import { AppLocale, I18nOptions } from '../types';

interface LocaleDataModule {
  default: unknown;
}

// Angular bundles only the English date data; the other languages load theirs together with the translations.
const LOCALE_DATA_LOADERS: Record<Exclude<AppLocale, 'en'>, () => Promise<LocaleDataModule>> = {
  es: () => import('@angular/common/locales/es'),
  de: () => import('@angular/common/locales/de'),
  fr: () => import('@angular/common/locales/fr'),
  ru: () => import('@angular/common/locales/ru'),
  uk: () => import('@angular/common/locales/uk'),
};

// Loads the texts and the date data of a language at once, so both switch together.
@Injectable()
export class AppTranslocoLoader implements TranslocoLoader {
  private readonly options: I18nOptions = inject(I18N_OPTIONS);

  public getTranslation(lang: string): Observable<Translation> {
    const locale: AppLocale = isAppLocale(lang) ? lang : APP_DEFAULT_LOCALE;

    return from(Promise.all([this.options.loadTranslation(locale), this.loadLocaleData(locale)])).pipe(
      map(([translation]: [Translation, void]) => translation),
    );
  }

  private async loadLocaleData(locale: AppLocale): Promise<void> {
    if (locale === 'en') {
      return;
    }

    const localeData: LocaleDataModule = await LOCALE_DATA_LOADERS[locale]();
    registerLocaleData(localeData.default);
  }
}
