import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatOption, MatSelect } from '@angular/material/select';
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
import { CALENDAR_ADD_BIRTHDAY_QUERY_PARAM, RELATIONSHIP_OPTIONS, RelationshipOption } from '@birthday/web-birthdays-util';
import { BirthdayAvatarComponent, RelationshipDotComponent } from '@birthday/web-birthdays-ui';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AppTranslateService, LocaleDatePipe } from '@birthday/web-shared-i18n';
import { PeopleController, PeopleState } from '../../state';
import { PeopleSortColumn, PersonRow, RelationshipFilter } from '../../types';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ui-people-page',
  imports: [
    TranslocoPipe,
    LocaleDatePipe,
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
    MatOption,
    MatPrefix,
    MatProgressBar,
    MatRow,
    MatRowDef,
    MatSelect,
    MatSort,
    MatSortHeader,
    MatSuffix,
    MatTable,
    RouterLink,
    BirthdayAvatarComponent,
    RelationshipDotComponent,
  ],
  templateUrl: './people-page.component.html',
  styleUrl: './people-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeoplePageComponent {
  protected readonly columns: PeopleSortColumn[] = ['name', 'relationship', 'birthday', 'nextBirthday'];
  protected readonly relationshipOptions: RelationshipOption[] = RELATIONSHIP_OPTIONS;
  protected readonly addBirthdayQueryParams: Record<string, string> = { [CALENDAR_ADD_BIRTHDAY_QUERY_PARAM]: '1' };

  private readonly peopleState: ReadonlyState<PeopleState> = injectState(PeopleState);
  private readonly peopleController: PeopleController = inject(PeopleController);
  private readonly translator: AppTranslateService = inject(AppTranslateService);

  protected get people(): Signal<PersonRow[]> {
    return this.peopleState.people;
  }

  protected get visiblePeople(): Signal<PersonRow[]> {
    return this.peopleState.visiblePeople;
  }

  protected get searchQuery(): Signal<string> {
    return this.peopleState.searchQuery;
  }

  protected get relationshipFilter(): Signal<RelationshipFilter> {
    return this.peopleState.relationshipFilter;
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

  protected filterPeopleByRelationship(relationship: RelationshipFilter): void {
    this.peopleController.filterPeopleByRelationship(relationship);
  }

  protected sortPeople(sort: Sort): void {
    this.peopleController.sortPeople(sort);
  }

  protected getDaysUntilLabel(daysUntil: number): string {
    if (daysUntil === 0) {
      return this.translator.translate('calendar.today');
    }

    return daysUntil === 1 ? this.translator.translate('calendar.tomorrow') : this.translator.translatePlural('calendar.inDays', daysUntil);
  }
}
