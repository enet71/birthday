import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GOOGLE_CALENDAR_BIRTHDAYS_GUIDE } from '../guides.constants';
import { Guide } from '../guides.interfaces';
import { RelatedGuidesComponent } from '../related-guides/related-guides.component';

@Component({
  selector: 'app-google-calendar-birthdays',
  imports: [DatePipe, RouterLink, RelatedGuidesComponent],
  templateUrl: './google-calendar-birthdays.component.html',
  styleUrl: '../guide-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCalendarBirthdaysComponent {
  protected readonly guide: Guide = GOOGLE_CALENDAR_BIRTHDAYS_GUIDE;
}
