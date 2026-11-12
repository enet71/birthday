import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { LocaleState } from '../state';
import { AppLocale, DateInput } from '../types';

// `DatePipe` reads `LOCALE_ID` once and would keep the old language after a switch; this pipe follows `LocaleState`.
// It is impure so a language switch reformats unchanged dates; the cache keeps the extra calls cheap.
@Pipe({ name: 'localeDate', pure: false })
export class LocaleDatePipe implements PipeTransform {
  private readonly localeState: ReadonlyState<LocaleState> = injectState(LocaleState);

  private lastValue: DateInput | null = null;
  private lastFormat = '';
  private lastLocale: AppLocale | null = null;
  private lastResult = '';

  public transform(value: DateInput | null | undefined, format: string): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const locale: AppLocale = this.localeState.locale();

    if (value !== this.lastValue || format !== this.lastFormat || locale !== this.lastLocale) {
      this.lastValue = value;
      this.lastFormat = format;
      this.lastLocale = locale;
      this.lastResult = formatDate(value, format, locale);
    }

    return this.lastResult;
  }
}
