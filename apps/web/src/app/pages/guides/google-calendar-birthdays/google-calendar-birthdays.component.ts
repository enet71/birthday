import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GOOGLE_CALENDAR_BIRTHDAYS_GUIDE } from '../guides.constants';
import { Guide } from '../guides.interfaces';
import { RelatedGuidesComponent } from '../related-guides/related-guides.component';
import { LocaleDatePipe } from '@birthday/web-shared-i18n';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-google-calendar-birthdays',
  imports: [TranslocoPipe, LocaleDatePipe, RouterLink, RelatedGuidesComponent],
  templateUrl: './google-calendar-birthdays.component.html',
  styleUrl: '../guide-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCalendarBirthdaysComponent {
  protected readonly guide: Guide = GOOGLE_CALENDAR_BIRTHDAYS_GUIDE;
}
