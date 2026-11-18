import { ChangeDetectionStrategy, Component, signal, WritableSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';
import { GoogleCalendarDisconnectDialogResult } from '../../types';

@Component({
  selector: 'ui-google-calendar-disconnect-dialog',
  imports: [TranslocoPipe, MatButton, MatCheckbox, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
  templateUrl: './google-calendar-disconnect-dialog.component.html',
  styleUrl: './google-calendar-disconnect-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCalendarDisconnectDialogComponent {
  protected readonly removeEvents: WritableSignal<boolean> = signal(false);

  protected get result(): GoogleCalendarDisconnectDialogResult {
    return { removeEvents: this.removeEvents() };
  }
}
