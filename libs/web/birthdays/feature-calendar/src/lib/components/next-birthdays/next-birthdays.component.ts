import { ChangeDetectionStrategy, Component, Signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { UpcomingBirthday } from '@birthday/web-birthdays-util';
import { CalendarState } from '../../state';
import { BirthdayAvatarComponent } from '../birthday-avatar';

@Component({
  selector: 'ui-next-birthdays',
  imports: [DatePipe, RouterLink, BirthdayAvatarComponent],
  templateUrl: './next-birthdays.component.html',
  styleUrl: './next-birthdays.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextBirthdaysComponent {
  private readonly calendarState: ReadonlyState<CalendarState> = injectState(CalendarState);

  protected get nextBirthdays(): Signal<UpcomingBirthday[]> {
    return this.calendarState.nextBirthdays;
  }

  protected getDaysUntilLabel(daysUntil: number): string {
    if (daysUntil === 0) {
      return 'Today';
    }

    return daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`;
  }
}
