// Birthdays without a known year are stored in this year. It is the smallest leap year Postgres accepts, so Feb 29 fits.
export const UNKNOWN_BIRTH_YEAR = 4;

// Query parameter that opens the Add birthday dialog on the calendar, so other pages can link to it.
export const CALENDAR_ADD_BIRTHDAY_QUERY_PARAM = 'add';
