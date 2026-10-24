import { Route } from '@angular/router';
import { provideAddBirthdayDialog } from './calendar.dialogs';
import { CalendarPageComponent } from './components';
import { CalendarController, CalendarState } from './state';

export const CALENDAR_ROUTES: Route[] = [
  {
    path: '',
    component: CalendarPageComponent,
    providers: [CalendarState, CalendarController, provideAddBirthdayDialog()],
  },
];
