import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { CalendarController, CalendarState } from '../../state';
import { UpcomingCelebration } from '../../types';

@Component({
  selector: 'ui-next-celebration',
  imports: [DatePipe, MatButton, MatIcon],
  templateUrl: './next-celebration.component.html',
  styleUrl: './next-celebration.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextCelebrationComponent {
  private readonly calendarState: ReadonlyState<CalendarState> = injectState(CalendarState);
  private readonly calendarController: CalendarController = inject(CalendarController);

  protected readonly countdown: Signal<string> = computed(() => {
    const daysUntil: number = this.nextCelebration()?.daysUntil ?? 0;

    if (daysUntil === 0) {
      return 'Today';
    }

    return daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`;
  });

  protected get nextCelebration(): Signal<UpcomingCelebration | null> {
    return this.calendarState.nextCelebration;
  }

  protected get isLoading(): Signal<boolean> {
    return this.calendarState.isLoading;
  }

  protected openAddBirthdayDialog(): void {
    this.calendarController.openAddBirthdayDialog();
  }
}
