import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { addMonths, addYears, startOfMonth } from 'date-fns';
import { StateController } from '@birthday/web-shared-data-access';
import { BirthdaysController } from '@birthday/web-birthdays-data-access';
import { AddBirthdayFormModel, CalendarView } from '../types';
import { CalendarState } from './calendar.state';

@Injectable()
export class CalendarController extends StateController {
  private readonly calendarState: CalendarState = inject(CalendarState);
  private readonly birthdaysController: BirthdaysController =
    inject(BirthdaysController);

  public setView(view: CalendarView): void {
    this.calendarState.view.set(view);
  }

  public showPrevious(): void {
    this.shiftViewMonth(-1);
  }

  public showNext(): void {
    this.shiftViewMonth(1);
  }

  public showToday(): void {
    this.calendarState.viewMonth.set(startOfMonth(this.calendarState.today));
  }

  public openAddBirthdayDialog(date: Date = this.calendarState.today): void {
    this.calendarState.addBirthdayDialog.set({ date });
  }

  public closeAddBirthdayDialog(): void {
    this.calendarState.addBirthdayDialog.set(null);
  }

  public saveBirthday({ name, date }: AddBirthdayFormModel): void {
    this.birthdaysController
      .addBirthday(name, date)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.closeAddBirthdayDialog());
  }

  private shiftViewMonth(step: number): void {
    const shift: (date: Date, amount: number) => Date =
      this.calendarState.view() === 'year' ? addYears : addMonths;

    this.calendarState.viewMonth.update((month: Date) => shift(month, step));
  }
}
