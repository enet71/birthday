import { ChangeDetectionStrategy, Component, inject, Signal, signal, WritableSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect, MatSelectChange, MatSelectTrigger } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  CELEBRITY_DECADES,
  CELEBRITY_OCCUPATIONS,
  CELEBRITY_SORTS,
  CELEBRITY_STATUSES,
  CelebrityDecade,
  CelebrityOccupation,
  CelebritySort,
  CelebrityStatus,
} from '@birthday/shared-models';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { BornDayController, BornDayState } from '../../state';
import { BornCountryOption, BornFilters } from '../../types';

@Component({
  selector: 'ui-born-filters',
  imports: [TranslocoPipe, MatButton, MatFormField, MatIcon, MatOption, MatSelect, MatSelectTrigger],
  templateUrl: './born-filters.component.html',
  styleUrl: './born-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BornFiltersComponent {
  private readonly bornDayState: ReadonlyState<BornDayState> = injectState(BornDayState);
  private readonly bornDayController: BornDayController = inject(BornDayController);

  protected readonly occupations: readonly CelebrityOccupation[] = CELEBRITY_OCCUPATIONS;
  protected readonly decades: readonly CelebrityDecade[] = CELEBRITY_DECADES;
  protected readonly statuses: readonly CelebrityStatus[] = CELEBRITY_STATUSES;
  protected readonly sorts: readonly CelebritySort[] = CELEBRITY_SORTS;
  // Phones show the filters only after the toggle; wider screens always show them.
  protected readonly isPanelOpen: WritableSignal<boolean> = signal(false);

  protected get filters(): Signal<BornFilters> {
    return this.bornDayState.filters;
  }

  protected get countryOptions(): Signal<BornCountryOption[]> {
    return this.bornDayState.countryOptions;
  }

  protected get activeFilterCount(): Signal<number> {
    return this.bornDayState.activeFilterCount;
  }

  protected getCountryName(code: string): string {
    return this.countryOptions().find((option: BornCountryOption) => option.code === code)?.name ?? code;
  }

  protected changeCountries({ value }: MatSelectChange<string[]>): void {
    this.bornDayController.changeFilters({ countries: value });
  }

  protected changeOccupations({ value }: MatSelectChange<CelebrityOccupation[]>): void {
    this.bornDayController.changeFilters({ occupations: value });
  }

  protected changeDecades({ value }: MatSelectChange<CelebrityDecade[]>): void {
    this.bornDayController.changeFilters({ decades: value });
  }

  protected changeStatus({ value }: MatSelectChange<CelebrityStatus>): void {
    this.bornDayController.changeFilters({ status: value });
  }

  protected changeSort({ value }: MatSelectChange<CelebritySort>): void {
    this.bornDayController.changeFilters({ sort: value });
  }

  protected resetFilters(): void {
    this.bornDayController.resetFilters();
  }

  protected togglePanel(): void {
    this.isPanelOpen.update((isOpen: boolean) => !isOpen);
  }
}
