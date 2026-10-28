import { computed, inject, Injectable, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { startOfToday } from 'date-fns';
import { AuthState } from '@birthday/web-auth-data-access';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { Birthday, getUpcomingBirthdays, UpcomingBirthday } from '@birthday/web-birthdays-util';
import { BirthdaysDataService } from '../services';

@Injectable({ providedIn: 'root' })
export class BirthdaysState extends State {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly birthdaysData: BirthdaysDataService = inject(BirthdaysDataService);

  public readonly today: Date = startOfToday();
  // The data source depends on sign-in, so a sign-in change reloads the list. Nothing loads until the session is
  // restored, so local birthdays do not flash before the account ones.
  public readonly birthdaysResource: ResourceRef<Birthday[]> = rxResource({
    params: () => (this.authState.status() === 'unknown' ? undefined : this.authState.isAuthenticated()),
    stream: () => this.birthdaysData.getAll(),
    defaultValue: [],
  });
  public readonly birthdays: Signal<Birthday[]> = computed(() => (this.birthdaysResource.hasValue() ? this.birthdaysResource.value() : []));
  public readonly isLoading: Signal<boolean> = computed(() => this.authState.status() === 'unknown' || this.birthdaysResource.isLoading());
  public readonly upcomingBirthdays: Signal<UpcomingBirthday[]> = computed(() => getUpcomingBirthdays(this.birthdays(), this.today));

  public override resetState(): void {
    this.birthdaysResource.set([]);
  }
}
