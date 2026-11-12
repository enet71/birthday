import { Route } from '@angular/router';
import { APP_DESCRIPTION_DATA_KEY } from '../../app.constants';
import { BIRTHDAY_REMINDERS_GUIDE, GOOGLE_CALENDAR_BIRTHDAYS_GUIDE, IMPORT_FROM_GOOGLE_CONTACTS_GUIDE } from './guides.constants';
import { buildGuideRoute } from './guides.helpers';

// Every guide also needs an entry in `app.routes.server.ts` and a URL in `sitemap.xml`.
export const GUIDES_ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    title: 'routes.guides.title',
    data: {
      [APP_DESCRIPTION_DATA_KEY]: 'routes.guides.description',
    },
    loadComponent: () => import('./guides-index/guides-index.component').then((m) => m.GuidesIndexComponent),
  },
  buildGuideRoute(GOOGLE_CALENDAR_BIRTHDAYS_GUIDE, () =>
    import('./google-calendar-birthdays/google-calendar-birthdays.component').then((m) => m.GoogleCalendarBirthdaysComponent),
  ),
  buildGuideRoute(BIRTHDAY_REMINDERS_GUIDE, () =>
    import('./birthday-reminders/birthday-reminders.component').then((m) => m.BirthdayRemindersComponent),
  ),
  buildGuideRoute(IMPORT_FROM_GOOGLE_CONTACTS_GUIDE, () =>
    import('./import-from-google-contacts/import-from-google-contacts.component').then((m) => m.ImportFromGoogleContactsComponent),
  ),
];
