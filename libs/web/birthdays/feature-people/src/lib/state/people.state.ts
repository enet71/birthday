import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { BirthdaysState } from '@birthday/web-birthdays-data-access';
import { Birthday } from '@birthday/web-birthdays-util';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { filterPersonRows, sortPersonRows, toPersonRow } from '../helpers';
import { PersonRow } from '../types';

@Injectable()
export class PeopleState extends State {
  private readonly birthdaysState: ReadonlyState<BirthdaysState> = injectState(BirthdaysState);

  public readonly isLoading: Signal<boolean> = this.birthdaysState.isLoading;
  public readonly searchQuery: WritableSignal<string> = signal('');
  public readonly sort: WritableSignal<Sort> = signal({ active: 'nextBirthday', direction: 'asc' });

  public readonly people: Signal<PersonRow[]> = computed(() =>
    this.birthdaysState.birthdays().map((birthday: Birthday) => toPersonRow(birthday, this.birthdaysState.today)),
  );
  public readonly visiblePeople: Signal<PersonRow[]> = computed(() =>
    sortPersonRows(filterPersonRows(this.people(), this.searchQuery()), this.sort()),
  );

  public override resetState(): void {
    this.searchQuery.set('');
    this.sort.set({ active: 'nextBirthday', direction: 'asc' });
  }
}
