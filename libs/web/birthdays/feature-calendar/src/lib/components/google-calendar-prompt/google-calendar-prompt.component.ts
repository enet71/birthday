import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { CalendarController, CalendarState } from '../../state';
import { GoogleCalendarPrompt } from '../../types';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ui-google-calendar-prompt',
  imports: [TranslocoPipe, MatButton, MatIcon],
  templateUrl: './google-calendar-prompt.component.html',
  styleUrl: './google-calendar-prompt.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCalendarPromptComponent {
  private readonly calendarState: ReadonlyState<CalendarState> = injectState(CalendarState);
  private readonly calendarController: CalendarController = inject(CalendarController);

  protected get prompt(): Signal<GoogleCalendarPrompt | null> {
    return this.calendarState.googleCalendarPrompt;
  }

  protected get isConnecting(): Signal<boolean> {
    return this.calendarState.isConnectingGoogleCalendar;
  }

  protected connect(): void {
    this.calendarController.connectGoogleCalendar();
  }
}
