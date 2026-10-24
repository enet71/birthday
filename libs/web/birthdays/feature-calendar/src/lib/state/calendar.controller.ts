import { inject, Injectable } from '@angular/core';
import { addMonths, startOfMonth } from 'date-fns';
import { StateController } from '@birthday/web-shared-data-access';
import { BirthdaysController } from '@birthday/web-birthdays-data-access';
import { AddBirthdayFormModel } from '../types';
import { CalendarState } from './calendar.state';

@Injectable()
export class CalendarController extends StateController {
  private readonly calendarState: CalendarState = inject(CalendarState);
  private readonly birthdaysController: BirthdaysController =
    inject(BirthdaysController);

  public showPreviousMonth(): void {
    this.calendarState.viewMonth.update((month: Date) => addMonths(month, -1));
  }

  public showNextMonth(): void {
    this.calendarState.viewMonth.update((month: Date) => addMonths(month, 1));
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
    this.birthdaysController.addBirthday(name, date);
    this.closeAddBirthdayDialog();
  }
}
