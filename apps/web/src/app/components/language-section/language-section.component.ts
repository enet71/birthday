import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { APP_LOCALE_NAMES, APP_LOCALES, AppLocale, LocaleController, LocaleState } from '@birthday/web-shared-i18n';

@Component({
  selector: 'app-language-section',
  imports: [MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatFormField, MatLabel, MatOption, MatSelect, TranslocoPipe],
  templateUrl: './language-section.component.html',
  styleUrl: './language-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSectionComponent {
  private readonly localeState: ReadonlyState<LocaleState> = injectState(LocaleState);
  private readonly localeController: LocaleController = inject(LocaleController);

  protected readonly locales: readonly AppLocale[] = APP_LOCALES;
  protected readonly localeNames: Record<AppLocale, string> = APP_LOCALE_NAMES;

  protected get locale(): Signal<AppLocale> {
    return this.localeState.locale;
  }

  protected changeLocale(locale: AppLocale): void {
    this.localeController.changeLocale(locale);
  }
}
