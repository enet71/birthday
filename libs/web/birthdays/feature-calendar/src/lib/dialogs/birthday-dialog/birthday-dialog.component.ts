import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FieldTree, form, FormField, maxLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { getDaysInMonth, parseISO } from 'date-fns';
import { hasBirthYear } from '@birthday/web-birthdays-util';
import { DialogHeaderComponent } from '@birthday/web-shared-ui';
import { CalendarController } from '../../state';
import { BirthdayDialogData, BirthdayFormModel } from '../../types';

// A leap year, so Feb 29 can be chosen while the birth year is empty.
const ANY_LEAP_YEAR = 2000;

@Component({
  selector: 'ui-birthday-dialog',
  imports: [
    DatePipe,
    FormField,
    MatButton,
    MatIconButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatError,
    MatFormField,
    MatHint,
    MatLabel,
    MatPrefix,
    MatIcon,
    MatInput,
    MatOption,
    MatSelect,
    DialogHeaderComponent,
  ],
  templateUrl: './birthday-dialog.component.html',
  styleUrl: './birthday-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BirthdayDialogComponent {
  private readonly data: BirthdayDialogData = inject(MAT_DIALOG_DATA);
  private readonly calendarController: CalendarController = inject(CalendarController);

  protected readonly isEdit: boolean = !!this.data.birthday;
  protected readonly months: Date[] = Array.from({ length: 12 }, (_, index: number) => new Date(ANY_LEAP_YEAR, index));
  protected readonly model: WritableSignal<BirthdayFormModel> = signal(this.createModel());
  protected readonly days: Signal<number[]> = computed(() =>
    Array.from({ length: getDaysInMonth(new Date(ANY_LEAP_YEAR, this.model().month - 1)) }, (_, index: number) => index + 1),
  );
  protected readonly birthdayForm: FieldTree<BirthdayFormModel> = form(this.model, (path) => {
    required(path.name, { message: 'Enter a name' });
    pattern(path.name, /\S/, { message: 'Enter a name' });
    // Matches the database limit for account birthdays.
    maxLength(path.name, 200, { message: 'Name is too long' });
    pattern(path.year, /^([1-9]\d{3})?$/, { message: 'Enter a 4-digit year' });
    validate(path.year, ({ value }) =>
      Number(value()) > new Date().getFullYear() ? { kind: 'futureYear', message: "The year can't be in the future" } : undefined,
    );
    // Picking a shorter month keeps the chosen day, and Feb 29 exists only in leap years.
    validate(path.day, ({ value, valueOf }) => {
      const year: string = valueOf(path.year);
      const daysInMonth: number = getDaysInMonth(new Date(/^\d{4}$/.test(year) ? Number(year) : ANY_LEAP_YEAR, valueOf(path.month) - 1));

      return value() > daysInMonth ? { kind: 'invalidDay', message: 'No such day' } : undefined;
    });
  });

  protected save(event: Event): void {
    event.preventDefault();
    // `submit` requires a Promise-returning action; saving itself stays an Observable.
    submit(this.birthdayForm, async () => this.calendarController.saveBirthday(this.model()));
  }

  protected delete(): void {
    this.calendarController.deleteBirthday();
  }

  private createModel(): BirthdayFormModel {
    const birthDate: string | undefined = this.data.birthday?.birthDate;
    const date: Date = birthDate ? parseISO(birthDate) : this.data.date;

    return {
      name: this.data.birthday?.name ?? '',
      month: date.getMonth() + 1,
      day: date.getDate(),
      year: birthDate && hasBirthYear(birthDate) ? String(date.getFullYear()) : '',
    };
  }
}
