import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BIRTHDAY_REMINDERS_GUIDE, GOOGLE_CALENDAR_BIRTHDAYS_GUIDE } from '../guides.constants';
import { getGuidePath } from '../guides.helpers';
import { Guide } from '../guides.interfaces';
import { RelatedGuidesComponent } from '../related-guides/related-guides.component';
import { LocaleDatePipe } from '@birthday/web-shared-i18n';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-birthday-reminders',
  imports: [TranslocoPipe, LocaleDatePipe, RouterLink, RelatedGuidesComponent],
  templateUrl: './birthday-reminders.component.html',
  styleUrl: '../guide-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BirthdayRemindersComponent {
  protected readonly guide: Guide = BIRTHDAY_REMINDERS_GUIDE;
  protected readonly googleCalendarGuidePath: string = getGuidePath(GOOGLE_CALENDAR_BIRTHDAYS_GUIDE);
}
