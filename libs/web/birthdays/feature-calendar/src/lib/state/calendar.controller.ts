import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { addMonths, addYears, parseISO, startOfMonth } from 'date-fns';
import { StateController } from '@birthday/web-shared-data-access';
import { BirthdaysController } from '@birthday/web-birthdays-data-access';
import { Birthday } from '@birthday/web-birthdays-util';
import { BirthdayDialogData, BirthdayFormModel, CalendarView } from '../types';
import { CalendarState } from './calendar.state';

@Injectable()
export class CalendarController extends StateController {
  private readonly calendarState: CalendarState = inject(CalendarState);
  private readonly birthdaysController: BirthdaysController = inject(BirthdaysController);

  constructor() {
    super();
    this.birthdaysController.reloadBirthdays();
  }

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
    this.calendarState.birthdayDialog.set({ date });
  }

  public openEditBirthdayDialog(birthday: Birthday): void {
    this.calendarState.birthdayDialog.set({ date: parseISO(birthday.birthDate), birthday });
  }

  public closeBirthdayDialog(): void {
    this.calendarState.birthdayDialog.set(null);
  }

  public saveBirthday({ name, date }: BirthdayFormModel): void {
    const dialog: BirthdayDialogData | null = this.calendarState.birthdayDialog();
    const save$: Observable<Birthday> = dialog?.birthday
      ? this.birthdaysController.updateBirthday(dialog.birthday.id, name, date)
      : this.birthdaysController.addBirthday(name, date);

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.closeBirthdayDialogIfCurrent(dialog));
  }

  public deleteBirthday(): void {
    const dialog: BirthdayDialogData | null = this.calendarState.birthdayDialog();

    if (!dialog?.birthday) {
      return;
    }

    // Both storages emit once on success; a failed delete completes without emitting and keeps the dialog open.
    this.birthdaysController
      .deleteBirthday(dialog.birthday.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.closeBirthdayDialogIfCurrent(dialog));
  }

  // A slow request must not close a dialog the user opened after closing the one it started from.
  private closeBirthdayDialogIfCurrent(dialog: BirthdayDialogData | null): void {
    if (this.calendarState.birthdayDialog() === dialog) {
      this.closeBirthdayDialog();
    }
  }

  private shiftViewMonth(step: number): void {
    const shift: (date: Date, amount: number) => Date = this.calendarState.view() === 'year' ? addYears : addMonths;

    this.calendarState.viewMonth.update((month: Date) => shift(month, step));
  }
}
