import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CalendarController } from '../../state';
import { CalendarMonthComponent } from '../calendar-month';
import { CalendarToolbarComponent } from '../calendar-toolbar';
import { NextBirthdaysComponent } from '../next-birthdays';

@Component({
  selector: 'ui-calendar-page',
  imports: [
    MatFabButton,
    MatIcon,
    CalendarMonthComponent,
    CalendarToolbarComponent,
    NextBirthdaysComponent,
  ],
  templateUrl: './calendar-page.component.html',
  styleUrl: './calendar-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPageComponent {
  private readonly calendarController: CalendarController =
    inject(CalendarController);

  protected openAddBirthdayDialog(): void {
    this.calendarController.openAddBirthdayDialog();
  }
}
