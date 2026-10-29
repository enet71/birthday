import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { eachMonthOfInterval, endOfYear, isSameDay, isSameMonth, startOfMonth, startOfYear } from 'date-fns';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { BirthdaysState } from '@birthday/web-birthdays-data-access';
import { Birthday, getAgeOnDate, getMonthGridDays, isBirthdayOn, UpcomingBirthday } from '@birthday/web-birthdays-util';
import { NEXT_BIRTHDAYS_LIMIT } from '../constants';
import { BirthdayDialogData, CalendarDay, CalendarMonth, CalendarView, UpcomingCelebration } from '../types';

@Injectable()
export class CalendarState extends State {
  private readonly birthdaysState: ReadonlyState<BirthdaysState> = injectState(BirthdaysState);

  public readonly today: Date = this.birthdaysState.today;
  public readonly isLoading: Signal<boolean> = this.birthdaysState.isLoading;
  public readonly view: WritableSignal<CalendarView> = signal('month');
  public readonly viewMonth: WritableSignal<Date> = signal(startOfMonth(this.today));
  public readonly birthdayDialog: WritableSignal<BirthdayDialogData | null> = signal(null);
  public readonly searchQuery: WritableSignal<string> = signal('');

  public readonly days: Signal<CalendarDay[]> = computed(() => this.getMonthDays(this.viewMonth(), this.birthdaysState.birthdays()));
  public readonly yearMonths: Signal<CalendarMonth[]> = computed(() => {
    const month: Date = this.viewMonth();
    const birthdays: Birthday[] = this.birthdaysState.birthdays();

    return eachMonthOfInterval({
      start: startOfYear(month),
      end: endOfYear(month),
    }).map(
      (date: Date): CalendarMonth => ({
        date,
        days: this.getMonthDays(date, birthdays),
      }),
    );
  });
  public readonly nextBirthdays: Signal<UpcomingCelebration[]> = computed(() => {
    const query: string = this.searchQuery().trim().toLowerCase();

    return this.birthdaysState
      .upcomingBirthdays()
      .filter((upcoming: UpcomingBirthday) => upcoming.birthday.name.toLowerCase().includes(query))
      .slice(0, NEXT_BIRTHDAYS_LIMIT)
      .map(
        (upcoming: UpcomingBirthday): UpcomingCelebration => ({
          ...upcoming,
          age: getAgeOnDate(upcoming.birthday.birthDate, upcoming.date),
        }),
      );
  });
  public readonly nextCelebration: Signal<UpcomingCelebration | null> = computed(() => this.nextBirthdays()[0] ?? null);

  public override resetState(): void {
    this.view.set('month');
    this.viewMonth.set(startOfMonth(this.today));
    this.birthdayDialog.set(null);
    this.searchQuery.set('');
  }

  private getMonthDays(month: Date, birthdays: Birthday[]): CalendarDay[] {
    return getMonthGridDays(month).map(
      (date: Date): CalendarDay => ({
        date,
        isCurrentMonth: isSameMonth(date, month),
        isToday: isSameDay(date, this.today),
        birthdays: birthdays.filter((birthday: Birthday) => isBirthdayOn(birthday.birthDate, date)),
      }),
    );
  }
}
