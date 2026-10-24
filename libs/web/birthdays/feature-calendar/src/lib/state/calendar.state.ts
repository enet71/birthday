import {
  computed,
  Injectable,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { isSameDay, isSameMonth, startOfMonth } from 'date-fns';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { BirthdaysState } from '@birthday/web-birthdays-data-access';
import {
  Birthday,
  getMonthGridDays,
  isBirthdayOn,
  UpcomingBirthday,
} from '@birthday/web-birthdays-util';
import { NEXT_BIRTHDAYS_LIMIT } from '../constants';
import { AddBirthdayDialogData, CalendarDay } from '../types';

@Injectable()
export class CalendarState extends State {
  private readonly birthdaysState: ReadonlyState<BirthdaysState> =
    injectState(BirthdaysState);

  public readonly today: Date = this.birthdaysState.today;
  public readonly viewMonth: WritableSignal<Date> = signal(
    startOfMonth(this.today),
  );
  public readonly addBirthdayDialog: WritableSignal<AddBirthdayDialogData | null> =
    signal(null);

  public readonly days: Signal<CalendarDay[]> = computed(() => {
    const month: Date = this.viewMonth();
    const birthdays: Birthday[] = this.birthdaysState.birthdays();

    return getMonthGridDays(month).map(
      (date: Date): CalendarDay => ({
        date,
        isCurrentMonth: isSameMonth(date, month),
        isToday: isSameDay(date, this.today),
        birthdays: birthdays.filter((birthday: Birthday) =>
          isBirthdayOn(birthday.birthDate, date),
        ),
      }),
    );
  });
  public readonly nextBirthdays: Signal<UpcomingBirthday[]> = computed(() =>
    this.birthdaysState.upcomingBirthdays().slice(0, NEXT_BIRTHDAYS_LIMIT),
  );

  public override resetState(): void {
    this.viewMonth.set(startOfMonth(this.today));
    this.addBirthdayDialog.set(null);
  }
}
