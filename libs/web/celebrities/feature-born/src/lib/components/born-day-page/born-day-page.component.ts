import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatDatepicker, MatDatepickerInput, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AppTranslateService, LocaleDatePipe } from '@birthday/web-shared-i18n';
import { BornDayController, BornDayState } from '../../state';
import { CelebrityCard } from '../../types';
import { BornFiltersComponent } from '../born-filters/born-filters.component';
import { CelebrityCardComponent } from '../celebrity-card/celebrity-card.component';

@Component({
  selector: 'ui-born-day-page',
  imports: [
    TranslocoPipe,
    LocaleDatePipe,
    RouterLink,
    MatButton,
    MatDatepicker,
    MatDatepickerInput,
    MatIcon,
    BornFiltersComponent,
    CelebrityCardComponent,
  ],
  templateUrl: './born-day-page.component.html',
  styleUrl: './born-day-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BornDayPageComponent {
  private readonly bornDayState: ReadonlyState<BornDayState> = injectState(BornDayState);
  private readonly bornDayController: BornDayController = inject(BornDayController);
  private readonly translator: AppTranslateService = inject(AppTranslateService);

  protected readonly summary: Signal<string> = computed(() => this.translator.translatePlural('born.day.count', this.bornDayState.total()));

  protected get cards(): Signal<CelebrityCard[]> {
    return this.bornDayState.cards;
  }

  protected get activeFilterCount(): Signal<number> {
    return this.bornDayState.activeFilterCount;
  }

  protected get hasLoadError(): Signal<boolean> {
    return this.bornDayState.hasLoadError;
  }

  protected get isLoading(): Signal<boolean> {
    return this.bornDayState.isLoading;
  }

  protected get pickerDate(): Signal<Date | null> {
    return this.bornDayState.pickerDate;
  }

  protected get previousDate(): Signal<Date | null> {
    return this.bornDayState.previousDate;
  }

  protected get nextDate(): Signal<Date | null> {
    return this.bornDayState.nextDate;
  }

  protected get previousPath(): Signal<string | null> {
    return this.bornDayState.previousPath;
  }

  protected get nextPath(): Signal<string | null> {
    return this.bornDayState.nextPath;
  }

  protected openDate({ value }: MatDatepickerInputEvent<Date>): void {
    if (value) {
      this.bornDayController.openDate(value);
    }
  }

  protected resetFilters(): void {
    this.bornDayController.resetFilters();
  }

  protected get hasMore(): Signal<boolean> {
    return this.bornDayState.hasMore;
  }

  protected get isLoadingMore(): Signal<boolean> {
    return this.bornDayState.isLoadingMore;
  }

  protected showMore(): void {
    this.bornDayController.showMore();
  }

  protected retry(): void {
    this.bornDayController.retry();
  }
}
