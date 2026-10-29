import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatFormField, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { SOON_BIRTHDAY_DAYS } from '../../constants';
import { CalendarController, CalendarState } from '../../state';
import { UpcomingCelebration } from '../../types';
import { BirthdayAvatarComponent } from '../birthday-avatar';

@Component({
  selector: 'ui-next-birthdays',
  imports: [DatePipe, MatFormField, MatIcon, MatIconButton, MatInput, MatPrefix, MatSuffix, RouterLink, BirthdayAvatarComponent],
  templateUrl: './next-birthdays.component.html',
  styleUrl: './next-birthdays.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextBirthdaysComponent {
  protected readonly soonDays: number = SOON_BIRTHDAY_DAYS;

  private readonly calendarState: ReadonlyState<CalendarState> = injectState(CalendarState);
  private readonly calendarController: CalendarController = inject(CalendarController);

  protected get nextBirthdays(): Signal<UpcomingCelebration[]> {
    return this.calendarState.nextBirthdays;
  }

  protected get isLoading(): Signal<boolean> {
    return this.calendarState.isLoading;
  }

  protected get searchQuery(): Signal<string> {
    return this.calendarState.searchQuery;
  }

  protected setSearchQuery(event: Event): void {
    this.calendarController.setSearchQuery((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.calendarController.setSearchQuery('');
  }

  protected getDaysUntilLabel(daysUntil: number): string {
    if (daysUntil === 0) {
      return 'Today';
    }

    return daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`;
  }
}
