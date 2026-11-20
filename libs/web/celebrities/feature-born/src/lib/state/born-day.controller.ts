import { effect, inject, Injectable, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateAdapter } from '@angular/material/core';
import { Router, UrlTree } from '@angular/router';
import { catchError, EMPTY, finalize, map, Observable, of, Subscription, tap } from 'rxjs';
import { AppLocale, CelebritiesResponse, CelebrityDto } from '@birthday/shared-models';
import { CelebritiesApiService } from '@birthday/web-celebrities-data-access';
import { AppLayoutController } from '@birthday/web-layout-data-access';
import { injectState, ReadonlyState, StateController } from '@birthday/web-shared-data-access';
import { AppTranslateService, LocaleState } from '@birthday/web-shared-i18n';
import { NotificationsService } from '@birthday/web-shared-util';
import {
  BORN_DEFAULT_FILTERS,
  getBornDayPath,
  isSameBornDate,
  isSameBornFilters,
  readBornFilters,
  toBornDate,
  toBornFilterQueryParams,
  toCelebritiesRequest,
} from '../helpers';
import { BornDate, BornFilters } from '../types';
import { BornDayState } from './born-day.state';

@Injectable()
export class BornDayController extends StateController {
  private readonly bornDayState: BornDayState = inject(BornDayState);
  private readonly celebritiesApi: CelebritiesApiService = inject(CelebritiesApiService);
  private readonly router: Router = inject(Router);
  private readonly dateAdapter: DateAdapter<Date> = inject(DateAdapter);
  private readonly localeState: ReadonlyState<LocaleState> = injectState(LocaleState);
  private readonly notifications: NotificationsService = inject(NotificationsService);
  private readonly translator: AppTranslateService = inject(AppTranslateService);
  // The next page being loaded; replacing the people cancels it.
  private nextPage: Subscription | null = null;

  constructor() {
    super();
    inject(AppLayoutController).trackLoading(this.bornDayState.isLoading, this.destroyRef);
    // The datepicker names months and weekdays in the current language.
    effect(() => this.dateAdapter.setLocale(this.localeState.locale()));
    // The names and Wikipedia links come in the current language, so a new language loads the people again.
    effect(() => {
      const locale: AppLocale = this.localeState.locale();

      untracked(() => this.reloadInLocale(locale));
    });
  }

  // The resolver calls it on every navigation; a new date or new filters, a new language, or a failed load loads the
  // first page again.
  public openDay(date: BornDate, filters: BornFilters): Observable<CelebrityDto[]> {
    const shown: BornDate | null = this.bornDayState.date();
    const isShown: boolean =
      !!shown &&
      isSameBornDate(shown, date) &&
      isSameBornFilters(this.bornDayState.filters(), filters) &&
      this.bornDayState.locale() === this.localeState.locale() &&
      !this.bornDayState.hasLoadError();

    return isShown ? of(this.bornDayState.celebrities()) : this.loadFirstPage(date, filters);
  }

  public retry(): void {
    const date: BornDate | null = this.bornDayState.date();

    if (date) {
      this.loadFirstPage(date, this.bornDayState.filters()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  // Appends the next page. Replacing the people cancels it. People who moved up between the pages while the import
  // updated their page views are not shown twice.
  public showMore(): void {
    const date: BornDate | null = this.bornDayState.date();
    const filters: BornFilters = this.bornDayState.filters();
    const locale: AppLocale | null = this.bornDayState.locale();

    if (!date || !locale || this.bornDayState.isLoadingMore() || !this.bornDayState.hasMore()) {
      return;
    }

    this.bornDayState.isLoadingMore.set(true);
    this.nextPage = this.celebritiesApi
      .getByDate(toCelebritiesRequest(date, filters, locale, this.bornDayState.celebrities().length))
      .pipe(
        tap((response: CelebritiesResponse) => {
          this.bornDayState.celebrities.update((celebrities: CelebrityDto[]) => appendNew(celebrities, response.celebrities));
          this.bornDayState.total.set(response.total);
        }),
        catchError(() => {
          this.notifications.createErrorNotification(this.translator.translate('notifications.born.loadMoreFailed'));

          return EMPTY;
        }),
        finalize(() => this.bornDayState.isLoadingMore.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  // The filters stay when another date opens.
  public openDate(date: Date): void {
    this.router.navigate([getBornDayPath(toBornDate(date))], { queryParamsHandling: 'preserve' });
  }

  // The URL keeps the filters; the resolver passes them to the State. Filter changes replace the history entry, so Back
  // leaves the date instead of stepping through every filter click.
  public changeFilters(changes: Partial<BornFilters>): void {
    this.router.navigate([], {
      queryParams: toBornFilterQueryParams({ ...this.getRequestedFilters(), ...changes }),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // Keeps the sort order, which is not a filter.
  public resetFilters(): void {
    this.changeFilters({ ...BORN_DEFAULT_FILTERS, sort: this.getRequestedFilters().sort });
  }

  // The State has the filters of the people shown; a filter navigation still loading may already ask for others, and the
  // next change must build on those.
  private getRequestedFilters(): BornFilters {
    const url: UrlTree = this.router.currentNavigation()?.extractedUrl ?? this.router.parseUrl(this.router.url);

    return readBornFilters(url.queryParamMap);
  }

  private reloadInLocale(locale: AppLocale): void {
    const date: BornDate | null = this.bornDayState.date();
    const shownLocale: AppLocale | null = this.bornDayState.locale();

    if (date && shownLocale && shownLocale !== locale) {
      this.loadFirstPage(date, this.bornDayState.filters()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
  }

  // The date and filters change together with the people, so the page never shows a new date's navigation above the
  // old date's people. A failed load does not cancel the navigation: the page opens with the error state and a retry
  // button.
  private loadFirstPage(date: BornDate, filters: BornFilters): Observable<CelebrityDto[]> {
    const locale: AppLocale = this.localeState.locale();

    this.bornDayState.isLoading.set(true);
    this.bornDayState.hasLoadError.set(false);

    return this.celebritiesApi.getByDate(toCelebritiesRequest(date, filters, locale, 0)).pipe(
      tap((response: CelebritiesResponse) => this.show(date, filters, locale, response)),
      map((response: CelebritiesResponse) => response.celebrities),
      catchError(() => {
        this.show(date, filters, locale, { celebrities: [], total: 0 });
        this.bornDayState.hasLoadError.set(true);

        return of([]);
      }),
      finalize(() => this.bornDayState.isLoading.set(false)),
    );
  }

  private show(date: BornDate, filters: BornFilters, locale: AppLocale, response: CelebritiesResponse): void {
    this.nextPage?.unsubscribe();
    this.nextPage = null;
    this.bornDayState.isLoadingMore.set(false);
    this.bornDayState.date.set(date);
    this.bornDayState.filters.set(filters);
    this.bornDayState.locale.set(locale);
    this.bornDayState.celebrities.set(response.celebrities);
    this.bornDayState.total.set(response.total);
  }
}

function appendNew(shown: CelebrityDto[], page: CelebrityDto[]): CelebrityDto[] {
  const ids: Set<string> = new Set(shown.map(({ id }) => id));

  return [...shown, ...page.filter(({ id }) => !ids.has(id))];
}
