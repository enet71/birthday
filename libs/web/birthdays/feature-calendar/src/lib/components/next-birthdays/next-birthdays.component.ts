import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { SOON_BIRTHDAY_DAYS } from '../../constants';
import { getBirthdayTone } from '../../helpers';
import { CalendarController, CalendarState } from '../../state';
import { BirthdayTone, UpcomingCelebration } from '../../types';
import { BirthdayAvatarComponent } from '../birthday-avatar';

@Component({
  selector: 'ui-next-birthdays',
  imports: [DatePipe, MatButton, MatIcon, RouterLink, BirthdayAvatarComponent],
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

  protected openAddBirthdayDialog(): void {
    this.calendarController.openAddBirthdayDialog();
  }

  protected openEditBirthdayDialog({ birthday }: UpcomingCelebration): void {
    this.calendarController.openEditBirthdayDialog(birthday);
  }

  // The row's tone colors its age pill to match the avatar.
  protected getToneStyles(name: string): Record<string, string> {
    const tone: BirthdayTone = getBirthdayTone(name);

    return {
      '--birthday-tone': `var(--app-tone-${tone}-ink)`,
      '--birthday-tone-container': `var(--app-tone-${tone})`,
    };
  }

  protected getDaysUntilLabel(daysUntil: number): string {
    if (daysUntil === 0) {
      return 'Today';
    }

    return daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`;
  }
}
