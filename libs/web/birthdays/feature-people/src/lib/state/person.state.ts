import { computed, inject, Injectable, Signal } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { BirthdaysState } from '@birthday/web-birthdays-data-access';
import { Birthday } from '@birthday/web-birthdays-util';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { createRouteParamsSignal, PlatformService } from '@birthday/web-shared-util';
import { PEOPLE_PERSON_ID_PARAM } from '../constants';
import { toPersonRow } from '../helpers';
import { PersonRow } from '../types';

@Injectable()
export class PersonState extends State {
  private readonly birthdaysState: ReadonlyState<BirthdaysState> = injectState(BirthdaysState);
  private readonly platform: PlatformService = inject(PlatformService);

  // A route-provided State gets the root `ActivatedRoute`, so the id is read from the whole router state.
  private readonly routeParams: Signal<Params | undefined> = createRouteParamsSignal(inject(Router), inject(ActivatedRoute));

  public readonly personId: Signal<string | null> = computed(() => this.routeParams()?.[PEOPLE_PERSON_ID_PARAM] ?? null);
  // Birthdays are known only in the browser, so the server and the first client render show the loader instead of
  // the "not found" message.
  public readonly isLoading: Signal<boolean> = computed(() => !this.platform.isRendered() || this.birthdaysState.isLoading());
  public readonly person: Signal<PersonRow | null> = computed(() => this.findPerson());

  private findPerson(): PersonRow | null {
    const birthday: Birthday | undefined = this.birthdaysState.birthdays().find((item: Birthday) => item.id === this.personId());

    return birthday ? toPersonRow(birthday, this.birthdaysState.today) : null;
  }
}
