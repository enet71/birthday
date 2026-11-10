import { Guide } from './guides.interfaces';

export const GOOGLE_CALENDAR_BIRTHDAYS_GUIDE: Guide = {
  slug: 'google-calendar-birthdays',
  title: 'How to add birthdays to Google Calendar',
  description: 'Add birthdays to Google Calendar as yearly birthday events with a reminder the day before, and keep them in sync with Birthdly.',
  updatedAt: '2026-11-10',
};

export const BIRTHDAY_REMINDERS_GUIDE: Guide = {
  slug: 'birthday-reminders',
  title: 'How to get birthday reminders',
  description:
    'Get a reminder the day before every birthday you add in Birthdly: set up Google Calendar notifications and keep upcoming birthdays in view.',
  updatedAt: '2026-11-10',
};

export const IMPORT_FROM_GOOGLE_CONTACTS_GUIDE: Guide = {
  slug: 'import-birthdays-from-google-contacts',
  title: 'How to import birthdays from Google Contacts',
  description:
    'Bring the birthdays saved in your Google Contacts into Birthdly, avoid duplicates, and keep them up to date without changing your contacts.',
  updatedAt: '2026-11-10',
};

// Listed on the guides page, on the About page, and under "Related guides" in this order.
export const GUIDES: Guide[] = [GOOGLE_CALENDAR_BIRTHDAYS_GUIDE, BIRTHDAY_REMINDERS_GUIDE, IMPORT_FROM_GOOGLE_CONTACTS_GUIDE];
