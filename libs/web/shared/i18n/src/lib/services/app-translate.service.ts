import { formatDate } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { APP_DEFAULT_LOCALE } from '../constants';
import { LocaleState } from '../state/locale.state';
import { AppLocale, DateInput } from '../types';

// Translates in TypeScript. It reads `LocaleState`, so a template, `computed`, or `effect` that calls it updates after a language switch.
@Injectable({ providedIn: 'root' })
export class AppTranslateService {
  private readonly transloco: TranslocoService = inject(TranslocoService);
  private readonly localeState: ReadonlyState<LocaleState> = injectState(LocaleState);

  public translate(key: string, params?: Record<string, unknown>): string {
    return this.transloco.translate(key, params, this.localeState.locale());
  }

  // Picks `<key>.one`, `<key>.few`, `<key>.many`, or `<key>.other` by the language's plural rules; `{{ count }}` is available in the text.
  // When the language lacks that form, the English form is used, so the English text shows instead of the key.
  public translatePlural(key: string, count: number, params?: Record<string, unknown>): string {
    const locale: AppLocale = this.localeState.locale();
    const pluralKey = `${key}.${new Intl.PluralRules(locale).select(count)}`;
    const resolvedKey: string =
      pluralKey in this.transloco.getTranslation(locale) ? pluralKey : `${key}.${new Intl.PluralRules(APP_DEFAULT_LOCALE).select(count)}`;

    return this.transloco.translate(resolvedKey, { count, ...params }, locale);
  }

  // `formatKey` is a translation key with an Angular date format, because languages order day and month differently.
  public formatDate(value: DateInput, formatKey: string): string {
    return formatDate(value, this.translate(formatKey), this.localeState.locale());
  }
}
