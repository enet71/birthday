import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AppTranslateService, LocaleDatePipe } from '@birthday/web-shared-i18n';
import { BirthdayTone, getBirthdayTone } from '@birthday/web-birthdays-util';
import { BirthdayAvatarComponent } from '@birthday/web-birthdays-ui';
import { SOON_BIRTHDAY_DAYS } from '../../constants';
import { CalendarController, CalendarState } from '../../state';
import { UpcomingCelebration } from '../../types';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ui-next-birthdays',
  imports: [TranslocoPipe, LocaleDatePipe, MatButton, MatIcon, RouterLink, BirthdayAvatarComponent],
  templateUrl: './next-birthdays.component.html',
  styleUrl: './next-birthdays.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextBirthdaysComponent {
  protected readonly soonDays: number = SOON_BIRTHDAY_DAYS;

  private readonly calendarState: ReadonlyState<CalendarState> = injectState(CalendarState);
  private readonly calendarController: CalendarController = inject(CalendarController);
  private readonly translator: AppTranslateService = inject(AppTranslateService);

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
      return this.translator.translate('calendar.today');
    }

    return daysUntil === 1 ? this.translator.translate('calendar.tomorrow') : this.translator.translatePlural('calendar.inDays', daysUntil);
  }
}
