import { computed, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { BirthdaysState } from '@birthday/web-birthdays-data-access';
import { Birthday } from '@birthday/web-birthdays-util';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { PlatformService } from '@birthday/web-shared-util';
import { filterPersonRows, sortPersonRows, toPersonRow } from '../helpers';
import { PersonRow } from '../types';

@Injectable()
export class PeopleState extends State {
  private readonly birthdaysState: ReadonlyState<BirthdaysState> = injectState(BirthdaysState);
  private readonly platform: PlatformService = inject(PlatformService);

  // Birthdays are known only in the browser, so the server and the first client render show the loader instead of
  // an empty list that would flash before the table.
  public readonly isLoading: Signal<boolean> = computed(() => !this.platform.isRendered() || this.birthdaysState.isLoading());
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
