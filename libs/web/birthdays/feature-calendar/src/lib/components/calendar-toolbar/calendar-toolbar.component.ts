import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatButtonToggle,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { CalendarController, CalendarState } from '../../state';

@Component({
  selector: 'ui-calendar-toolbar',
  imports: [
    DatePipe,
    MatButton,
    MatIconButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatIcon,
  ],
  templateUrl: './calendar-toolbar.component.html',
  styleUrl: './calendar-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarToolbarComponent {
  private readonly calendarState: ReadonlyState<CalendarState> =
    injectState(CalendarState);
  private readonly calendarController: CalendarController =
    inject(CalendarController);

  protected get viewMonth(): Signal<Date> {
    return this.calendarState.viewMonth;
  }

  protected showPreviousMonth(): void {
    this.calendarController.showPreviousMonth();
  }

  protected showNextMonth(): void {
    this.calendarController.showNextMonth();
  }

  protected showToday(): void {
    this.calendarController.showToday();
  }
}
