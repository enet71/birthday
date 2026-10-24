import {
  computed,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { startOfToday } from 'date-fns';
import { State } from '@birthday/web-shared-data-access';
import {
  Birthday,
  getUpcomingBirthdays,
  UpcomingBirthday,
} from '@birthday/web-birthdays-util';

@Injectable({ providedIn: 'root' })
export class BirthdaysState extends State {
  public readonly today: Date = startOfToday();
  public readonly birthdays: WritableSignal<Birthday[]> = signal([]);
  public readonly upcomingBirthdays: Signal<UpcomingBirthday[]> = computed(() =>
    getUpcomingBirthdays(this.birthdays(), this.today),
  );

  public override resetState(): void {
    this.birthdays.set([]);
  }
}
