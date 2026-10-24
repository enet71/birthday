import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatButtonToggle,
  MatButtonToggleChange,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { CalendarController, CalendarState } from '../../state';
import { CalendarView } from '../../types';

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

  protected readonly isYearView: Signal<boolean> = computed(
    () => this.view() === 'year',
  );

  protected get view(): Signal<CalendarView> {
    return this.calendarState.view;
  }

  protected get viewMonth(): Signal<Date> {
    return this.calendarState.viewMonth;
  }

  protected setView({ value }: MatButtonToggleChange): void {
    this.calendarController.setView(value);
  }

  protected showPrevious(): void {
    this.calendarController.showPrevious();
  }

  protected showNext(): void {
    this.calendarController.showNext();
  }

  protected showToday(): void {
    this.calendarController.showToday();
  }
}
