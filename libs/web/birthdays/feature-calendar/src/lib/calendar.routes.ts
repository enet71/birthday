import { Route } from '@angular/router';
import { birthdaysResolver } from '@birthday/web-birthdays-data-access';
import { provideAddBirthdayDialog } from './calendar.dialogs';
import { CalendarPageComponent } from './components';
import { CalendarController, CalendarState } from './state';

export const CALENDAR_ROUTES: Route[] = [
  {
    path: '',
    component: CalendarPageComponent,
    providers: [CalendarState, CalendarController, provideAddBirthdayDialog()],
    resolve: { birthdays: birthdaysResolver },
  },
];
