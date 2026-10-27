import { Route } from '@angular/router';
import { provideBirthdayDialog } from './calendar.dialogs';
import { CalendarPageComponent } from './components';
import { CalendarController, CalendarState } from './state';

export const CALENDAR_ROUTES: Route[] = [
  {
    path: '',
    component: CalendarPageComponent,
    providers: [CalendarState, CalendarController, provideBirthdayDialog()],
  },
];
