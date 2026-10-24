import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  FieldTree,
  form,
  FormField,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import {
  MatError,
  MatFormField,
  MatLabel,
  MatPrefix,
  MatSuffix,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { DialogHeaderComponent } from '@birthday/web-shared-ui';
import { BIRTHDAY_DATE_FORMATS } from '../../constants';
import { CalendarController } from '../../state';
import { AddBirthdayDialogData, AddBirthdayFormModel } from '../../types';

@Component({
  selector: 'ui-add-birthday-dialog',
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
  templateUrl: './add-birthday-dialog.component.html',
  styleUrl: './add-birthday-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddBirthdayDialogComponent {
  private readonly data: AddBirthdayDialogData = inject(MAT_DIALOG_DATA);
  private readonly calendarController: CalendarController =
    inject(CalendarController);

  protected readonly model: WritableSignal<AddBirthdayFormModel> = signal({
    name: '',
    date: this.data.date,
  });
  protected readonly birthdayForm: FieldTree<AddBirthdayFormModel> = form(
    this.model,
    (path) => {
      required(path.name, { message: 'Enter a name' });
      pattern(path.name, /\S/, { message: 'Enter a name' });
      required(path.date, { message: 'Choose a valid date' });
    },
  );

  protected save(event: Event): void {
    event.preventDefault();
    submit(this.birthdayForm, async () => {
      this.calendarController.saveBirthday(this.model());
    });
  }
}
