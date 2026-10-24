import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Signal,
} from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { CalendarController, CalendarState } from '../../state';
import { CalendarView } from '../../types';
import { CalendarMonthComponent } from '../calendar-month';
import { CalendarToolbarComponent } from '../calendar-toolbar';
import { CalendarYearComponent } from '../calendar-year';
import { NextBirthdaysComponent } from '../next-birthdays';

@Component({
  selector: 'ui-calendar-page',
  imports: [
    MatFabButton,
    MatIcon,
    CalendarMonthComponent,
    CalendarToolbarComponent,
    CalendarYearComponent,
    NextBirthdaysComponent,
  ],
  templateUrl: './calendar-page.component.html',
  styleUrl: './calendar-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPageComponent {
  private readonly calendarState: ReadonlyState<CalendarState> =
    injectState(CalendarState);
  private readonly calendarController: CalendarController =
    inject(CalendarController);

  protected get view(): Signal<CalendarView> {
    return this.calendarState.view;
  }

  protected openAddBirthdayDialog(): void {
    this.calendarController.openAddBirthdayDialog();
  }
}
