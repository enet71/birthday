import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { FieldTree, form, FormField, maxLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { getDaysInMonth, parseISO } from 'date-fns';
import { BirthdayRelationship } from '@birthday/shared-models';
import { hasBirthYear } from '@birthday/web-birthdays-util';
import { LocaleDatePipe } from '@birthday/web-shared-i18n';
import { DialogHeaderComponent } from '@birthday/web-shared-ui';
import { BIRTHDAY_NOTES_MAX_LENGTH, RELATIONSHIP_OPTIONS } from '../../constants';
import { CalendarController } from '../../state';
import { BirthdayDialogData, BirthdayFormModel, RelationshipOption } from '../../types';
import { TranslocoPipe } from '@jsverse/transloco';

// A leap year, so Feb 29 can be chosen while the birth year is empty.
const ANY_LEAP_YEAR = 2000;

@Component({
  selector: 'ui-birthday-dialog',
  imports: [
    TranslocoPipe,
    LocaleDatePipe,
    FormField,
    MatButton,
    MatIconButton,
    MatChipListbox,
    MatChipOption,
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
  protected readonly relationshipOptions: RelationshipOption[] = RELATIONSHIP_OPTIONS;
  protected readonly notesMaxLength: number = BIRTHDAY_NOTES_MAX_LENGTH;
  protected readonly months: Date[] = Array.from({ length: 12 }, (_, index: number) => new Date(ANY_LEAP_YEAR, index));
  protected readonly model: WritableSignal<BirthdayFormModel> = signal(this.createModel());
  protected readonly days: Signal<number[]> = computed(() =>
    Array.from({ length: getDaysInMonth(new Date(ANY_LEAP_YEAR, this.model().month - 1)) }, (_, index: number) => index + 1),
  );
  // Error messages are translation keys; the template translates them.
  protected readonly birthdayForm: FieldTree<BirthdayFormModel> = form(this.model, (path) => {
    required(path.name, { message: 'birthdayDialog.errors.nameRequired' });
    pattern(path.name, /\S/, { message: 'birthdayDialog.errors.nameRequired' });
    // Matches the database limit for account birthdays.
    maxLength(path.name, 200, { message: 'birthdayDialog.errors.nameTooLong' });
    pattern(path.year, /^([1-9]\d{3})?$/, { message: 'birthdayDialog.errors.yearFormat' });
    validate(path.year, ({ value }) =>
      Number(value()) > new Date().getFullYear() ? { kind: 'futureYear', message: 'birthdayDialog.errors.futureYear' } : undefined,
    );
    // Picking a shorter month keeps the chosen day, and Feb 29 exists only in leap years.
    validate(path.day, ({ value, valueOf }) => {
      const year: string = valueOf(path.year);
      const daysInMonth: number = getDaysInMonth(new Date(/^\d{4}$/.test(year) ? Number(year) : ANY_LEAP_YEAR, valueOf(path.month) - 1));

      return value() > daysInMonth ? { kind: 'invalidDay', message: 'birthdayDialog.errors.invalidDay' } : undefined;
    });
    maxLength(path.notes, BIRTHDAY_NOTES_MAX_LENGTH, { message: 'birthdayDialog.errors.notesTooLong' });
  });

  protected save(event: Event): void {
    event.preventDefault();
    // `submit` requires a Promise-returning action; saving itself stays an Observable.
    submit(this.birthdayForm, async () => this.calendarController.saveBirthday(this.model()));
  }

  // The listbox emits `undefined` when the selected chip is clicked again.
  protected setRelationship(relationship: BirthdayRelationship | undefined): void {
    this.birthdayForm.relationship().value.set(relationship ?? null);
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
      relationship: this.data.birthday?.relationship ?? null,
      notes: this.data.birthday?.notes ?? '',
    };
  }
}
