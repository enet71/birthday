import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { FieldTree, form, FormField, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { DialogHeaderComponent } from '@birthday/web-shared-ui';
import { BIRTHDAY_DATE_FORMATS } from '../../constants';
import { CalendarController } from '../../state';
import { BirthdayDialogData, BirthdayFormModel } from '../../types';

@Component({
  selector: 'ui-birthday-dialog',
  imports: [
    FormField,
    MatButton,
    MatIconButton,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatError,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatSuffix,
    MatIcon,
    MatInput,
    DialogHeaderComponent,
  ],
  providers: [provideNativeDateAdapter(BIRTHDAY_DATE_FORMATS)],
  templateUrl: './birthday-dialog.component.html',
  styleUrl: './birthday-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BirthdayDialogComponent {
  private readonly data: BirthdayDialogData = inject(MAT_DIALOG_DATA);
  private readonly calendarController: CalendarController = inject(CalendarController);

  protected readonly isEdit: boolean = !!this.data.birthday;
  protected readonly model: WritableSignal<BirthdayFormModel> = signal({
    name: this.data.birthday?.name ?? '',
    date: this.data.date,
  });
  protected readonly birthdayForm: FieldTree<BirthdayFormModel> = form(this.model, (path) => {
    required(path.name, { message: 'Enter a name' });
    pattern(path.name, /\S/, { message: 'Enter a name' });
    // Matches the database limit for account birthdays.
    maxLength(path.name, 200, { message: 'Name is too long' });
    required(path.date, { message: 'Choose a valid date' });
  });

  protected save(event: Event): void {
    event.preventDefault();
    // `submit` requires a Promise-returning action; saving itself stays an Observable.
    submit(this.birthdayForm, async () => this.calendarController.saveBirthday(this.model()));
  }

  protected delete(): void {
    this.calendarController.deleteBirthday();
  }
}
