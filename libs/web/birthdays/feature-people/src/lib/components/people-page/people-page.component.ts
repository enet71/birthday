import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { CALENDAR_ADD_BIRTHDAY_QUERY_PARAM } from '@birthday/web-birthdays-util';
import { BirthdayAvatarComponent } from '@birthday/web-birthdays-ui';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { PeopleController, PeopleState } from '../../state';
import { PeopleSortColumn, PersonRow } from '../../types';

@Component({
  selector: 'ui-people-page',
  imports: [
    DatePipe,
    MatButton,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatFormField,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatIcon,
    MatIconButton,
    MatInput,
    MatPrefix,
    MatProgressBar,
    MatRow,
    MatRowDef,
    MatSort,
    MatSortHeader,
    MatSuffix,
    MatTable,
    RouterLink,
    BirthdayAvatarComponent,
  ],
  templateUrl: './people-page.component.html',
  styleUrl: './people-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeoplePageComponent {
  protected readonly columns: PeopleSortColumn[] = ['name', 'birthday', 'age', 'nextBirthday'];
  protected readonly addBirthdayQueryParams: Record<string, string> = { [CALENDAR_ADD_BIRTHDAY_QUERY_PARAM]: '1' };

  private readonly peopleState: ReadonlyState<PeopleState> = injectState(PeopleState);
  private readonly peopleController: PeopleController = inject(PeopleController);

  protected get people(): Signal<PersonRow[]> {
    return this.peopleState.people;
  }

  protected get visiblePeople(): Signal<PersonRow[]> {
    return this.peopleState.visiblePeople;
  }

  protected get searchQuery(): Signal<string> {
    return this.peopleState.searchQuery;
  }

  protected get sort(): Signal<Sort> {
    return this.peopleState.sort;
  }

  protected get isLoading(): Signal<boolean> {
    return this.peopleState.isLoading;
  }

  protected searchPeople(event: Event): void {
    this.peopleController.searchPeople((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.peopleController.searchPeople('');
  }

  protected sortPeople(sort: Sort): void {
    this.peopleController.sortPeople(sort);
  }

  protected getDaysUntilLabel(daysUntil: number): string {
    if (daysUntil === 0) {
      return 'Today';
    }

    return daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`;
  }
}
