import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { Birthday } from '@birthday/web-birthdays-util';
import { getCalendarDayLabel } from '../../helpers';
import { CalendarController, CalendarState } from '../../state';
import { CalendarDay } from '../../types';
import { BirthdayChipComponent } from '../birthday-chip';

const DAYS_IN_WEEK = 7;

@Component({
  selector: 'ui-calendar-month',
  imports: [DatePipe, MatIcon, BirthdayChipComponent],
  templateUrl: './calendar-month.component.html',
  styleUrl: './calendar-month.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarMonthComponent {
  private readonly calendarState: ReadonlyState<CalendarState> = injectState(CalendarState);
  private readonly calendarController: CalendarController = inject(CalendarController);

  protected readonly weekdays: Signal<Date[]> = computed(() =>
    this.days()
      .slice(0, DAYS_IN_WEEK)
      .map((day: CalendarDay) => day.date),
  );

  protected get days(): Signal<CalendarDay[]> {
    return this.calendarState.days;
  }

  protected getDayLabel(day: CalendarDay): string {
    return getCalendarDayLabel(day);
  }

  protected openAddBirthdayDialog(date: Date): void {
    this.calendarController.openAddBirthdayDialog(date);
  }

  protected openEditBirthdayDialog(birthday: Birthday): void {
    this.calendarController.openEditBirthdayDialog(birthday);
  }
}
