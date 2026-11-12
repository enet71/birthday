import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, Signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatRadioButton, MatRadioChange, MatRadioGroup } from '@angular/material/radio';
import { MatOption, MatSelect, MatSelectChange } from '@angular/material/select';
import { ReminderSettings } from '@birthday/web-reminders-data-access';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { REMINDER_DAY_OPTIONS, REMINDER_HOUR_OPTIONS } from '../../constants';
import { ReminderSectionController, ReminderSectionState } from '../../state';
import { ReminderDayOption, ReminderHourOption, ReminderSectionView, ReminderSettingsModel } from '../../types';
import { LocaleDatePipe } from '@birthday/web-shared-i18n';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ui-reminder-section',
  imports: [
    TranslocoPipe,
    LocaleDatePipe,
    FormField,
    MatButton,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatFormField,
    MatIcon,
    MatLabel,
    MatOption,
    MatProgressSpinner,
    MatRadioButton,
    MatRadioGroup,
    MatSelect,
  ],
  providers: [ReminderSectionState, ReminderSectionController],
  templateUrl: './reminder-section.component.html',
  styleUrl: './reminder-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReminderSectionComponent {
  private readonly sectionState: ReadonlyState<ReminderSectionState> = injectState(ReminderSectionState);
  private readonly sectionController: ReminderSectionController = inject(ReminderSectionController);

  private readonly document: Document = inject(DOCUMENT);
  private readonly toggleButton: Signal<ElementRef<HTMLButtonElement> | undefined> = viewChild('toggleButton', { read: ElementRef });
  private clickedToggleButton: HTMLButtonElement | null = null;

  protected readonly dayOptions: ReminderDayOption[] = REMINDER_DAY_OPTIONS;
  protected readonly hourOptions: ReminderHourOption[] = REMINDER_HOUR_OPTIONS;

  protected get view(): Signal<ReminderSectionView> {
    return this.sectionState.view;
  }

  protected get settings(): Signal<ReminderSettings | null> {
    return this.sectionState.settings;
  }

  protected get settingsForm(): FieldTree<ReminderSettingsModel> {
    return this.sectionState.settingsForm;
  }

  protected get isPending(): Signal<boolean> {
    return this.sectionState.isPending;
  }

  constructor() {
    // Turning notifications on or off replaces the clicked button, so move the focus to the new one.
    afterRenderEffect(() => {
      const toggleButton: ElementRef<HTMLButtonElement> | undefined = this.toggleButton();

      const hasLostFocus: boolean = !this.document.activeElement || this.document.activeElement === this.document.body;

      if (toggleButton && this.clickedToggleButton && !this.clickedToggleButton.isConnected && hasLostFocus) {
        toggleButton.nativeElement.focus();
      }
      this.clickedToggleButton = null;
    });
  }

  protected enable(event: MouseEvent): void {
    this.clickedToggleButton = event.currentTarget as HTMLButtonElement;
    this.sectionController.enable();
  }

  protected disable(event: MouseEvent): void {
    this.clickedToggleButton = event.currentTarget as HTMLButtonElement;
    this.sectionController.disable();
  }

  protected reload(): void {
    this.sectionController.reload();
  }

  protected setDays(change: MatRadioChange): void {
    this.sectionController.setDays(change.value);
  }

  protected setHour(change: MatSelectChange<number>): void {
    this.sectionController.setHour(change.value);
  }
}
