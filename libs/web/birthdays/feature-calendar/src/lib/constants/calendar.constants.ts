import { MatDateFormats } from '@angular/material/core';

export const NEXT_BIRTHDAYS_LIMIT = 4;

// Birthdays this close are highlighted in the upcoming list.
export const SOON_BIRTHDAY_DAYS = 7;

export const BIRTHDAY_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: null },
  display: {
    dateInput: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};
