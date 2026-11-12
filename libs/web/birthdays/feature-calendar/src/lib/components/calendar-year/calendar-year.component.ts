import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AppTranslateService, LocaleDatePipe } from '@birthday/web-shared-i18n';
import { getBirthdayNames, getCalendarDayLabel } from '../../helpers';
import { CalendarController, CalendarState } from '../../state';
import { CalendarDay, CalendarMonth } from '../../types';

const DAYS_IN_WEEK = 7;

@Component({
  selector: 'ui-calendar-year',
  imports: [LocaleDatePipe, MatTooltip],
  templateUrl: './calendar-year.component.html',
  styleUrl: './calendar-year.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarYearComponent {
  private readonly calendarState: ReadonlyState<CalendarState> = injectState(CalendarState);
  private readonly calendarController: CalendarController = inject(CalendarController);
  private readonly translator: AppTranslateService = inject(AppTranslateService);

  protected readonly weekdays: Signal<Date[]> = computed(() =>
    this.months()[0]
      .days.slice(0, DAYS_IN_WEEK)
      .map((day: CalendarDay) => day.date),
  );

  protected get months(): Signal<CalendarMonth[]> {
    return this.calendarState.yearMonths;
  }

  protected getBirthdayNames(day: CalendarDay): string {
    return getBirthdayNames(day);
  }

  protected getDayLabel(day: CalendarDay): string {
    return getCalendarDayLabel(day, this.translator);
  }

  protected openAddBirthdayDialog(date: Date): void {
    this.calendarController.openAddBirthdayDialog(date);
  }
}
