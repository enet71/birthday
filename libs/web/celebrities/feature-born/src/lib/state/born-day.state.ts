import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { AppLocale, CELEBRITY_COUNTRIES, CelebrityDto } from '@birthday/shared-models';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { LocaleState } from '@birthday/web-shared-i18n';
import { BORN_DEFAULT_FILTERS, countActiveBornFilters, getBornDayPath, isSameBornDate, shiftBornDate, toBornDate, toReferenceDate } from '../helpers';
import { BornCountryOption, BornDate, BornFilters, CelebrityCard } from '../types';

@Injectable()
export class BornDayState extends State {
  private readonly currentYear: number = new Date().getFullYear();
  private readonly today: BornDate = toBornDate(new Date());
  private readonly localeState: ReadonlyState<LocaleState> = injectState(LocaleState);
  // Country names in the current language.
  private readonly countryNames: Signal<Intl.DisplayNames> = computed(() => new Intl.DisplayNames([this.localeState.locale()], { type: 'region' }));

  // The date, filters and language of the people shown; they change together with the people once those load.
  public readonly date: WritableSignal<BornDate | null> = signal(null);
  public readonly filters: WritableSignal<BornFilters> = signal(BORN_DEFAULT_FILTERS);
  public readonly locale: WritableSignal<AppLocale | null> = signal(null);
  // The pages loaded so far, the most popular first or in the chosen order.
  public readonly celebrities: WritableSignal<CelebrityDto[]> = signal([]);
  // How many people match the date and the filters.
  public readonly total: WritableSignal<number> = signal(0);
  public readonly hasLoadError: WritableSignal<boolean> = signal(false);
  public readonly isLoading: WritableSignal<boolean> = signal(false);
  public readonly isLoadingMore: WritableSignal<boolean> = signal(false);

  // The date in a leap year, for formatting; `null` before the first date opens.
  public readonly referenceDate: Signal<Date | null> = computed(() => this.toDate(this.date()));
  // The datepicker shows this year; February 29 of a common year stays in the leap year.
  public readonly pickerDate: Signal<Date | null> = computed(() => this.getPickerDate());
  public readonly previousDate: Signal<Date | null> = computed(() => this.toDate(this.shiftDate(-1)));
  public readonly nextDate: Signal<Date | null> = computed(() => this.toDate(this.shiftDate(1)));
  public readonly previousPath: Signal<string | null> = computed(() => this.toPath(this.shiftDate(-1)));
  public readonly nextPath: Signal<string | null> = computed(() => this.toPath(this.shiftDate(1)));
  public readonly todayPath: string = getBornDayPath(this.today);
  public readonly isToday: Signal<boolean> = computed(() => this.isTodayShown());
  public readonly activeFilterCount: Signal<number> = computed(() => countActiveBornFilters(this.filters()));
  public readonly countryOptions: Signal<BornCountryOption[]> = computed(() => this.getCountryOptions());
  public readonly cards: Signal<CelebrityCard[]> = computed(() => this.celebrities().map((celebrity: CelebrityDto) => this.toCard(celebrity)));
  public readonly hasMore: Signal<boolean> = computed(() => this.celebrities().length < this.total());

  private getPickerDate(): Date | null {
    const date: BornDate | null = this.date();

    if (!date) {
      return null;
    }

    const picker: Date = new Date(this.currentYear, date.month - 1, date.day);

    return picker.getMonth() === date.month - 1 ? picker : toReferenceDate(date);
  }

  private isTodayShown(): boolean {
    const date: BornDate | null = this.date();

    return !!date && isSameBornDate(date, this.today);
  }

  private shiftDate(days: number): BornDate | null {
    const date: BornDate | null = this.date();

    return date && shiftBornDate(date, days);
  }

  private toDate(date: BornDate | null): Date | null {
    return date && toReferenceDate(date);
  }

  private toPath(date: BornDate | null): string | null {
    return date && getBornDayPath(date);
  }

  private getCountryOptions(): BornCountryOption[] {
    return CELEBRITY_COUNTRIES.map((code: string) => ({ code, name: this.getCountryName(code) }));
  }

  private getCountryName(code: string): string {
    return this.countryNames().of(code) ?? code;
  }

  private toCard(celebrity: CelebrityDto): CelebrityCard {
    const birthYear = Number(celebrity.birthDate.slice(0, 4));
    const deathYear: number | null = celebrity.deathDate ? Number(celebrity.deathDate.slice(0, 4)) : null;

    return {
      id: celebrity.id,
      name: celebrity.name,
      occupation: celebrity.occupation,
      countries: celebrity.countries.map((code: string) => this.getCountryName(code)).join(', '),
      birthYear,
      deathYear,
      age: deathYear === null ? this.currentYear - birthYear : null,
      wikipediaUrl: celebrity.wikipediaUrl,
    };
  }
}
