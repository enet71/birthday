import { Guide } from './guides.interfaces';

export const GOOGLE_CALENDAR_BIRTHDAYS_GUIDE: Guide = {
  slug: 'google-calendar-birthdays',
  title: 'guides.googleCalendarBirthdays.title',
  description: 'guides.googleCalendarBirthdays.description',
  updatedAt: '2026-11-10',
};

export const BIRTHDAY_REMINDERS_GUIDE: Guide = {
  slug: 'birthday-reminders',
  title: 'guides.birthdayReminders.title',
  description: 'guides.birthdayReminders.description',
  updatedAt: '2026-11-10',
};

export const IMPORT_FROM_GOOGLE_CONTACTS_GUIDE: Guide = {
  slug: 'import-birthdays-from-google-contacts',
  title: 'guides.importFromGoogleContacts.title',
  description: 'guides.importFromGoogleContacts.description',
  updatedAt: '2026-11-10',
};

// Listed on the guides page, on the About page, and under "Related guides" in this order.
export const GUIDES: Guide[] = [GOOGLE_CALENDAR_BIRTHDAYS_GUIDE, BIRTHDAY_REMINDERS_GUIDE, IMPORT_FROM_GOOGLE_CONTACTS_GUIDE];
