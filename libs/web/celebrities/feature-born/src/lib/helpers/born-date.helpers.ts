import { ActivatedRouteSnapshot } from '@angular/router';
import { addDays } from 'date-fns';
import { BORN_BASE_PATH, BORN_DAY_PARAM, BORN_MONTH_PARAM, BORN_MONTH_SLUGS } from '../constants';
import { BornDate, BornTitlePart } from '../types';

// A leap year, so February 29 exists.
const REFERENCE_YEAR = 2000;

// Accepts only canonical URLs: a known month slug and a day without a leading zero that exists in that month.
export function parseBornDate(monthSlug: string | null | undefined, day: string | null | undefined): BornDate | null {
  const month: number = BORN_MONTH_SLUGS.findIndex((slug: string) => slug === monthSlug) + 1;

  if (!month || !day || !/^[1-9]\d?$/.test(day)) {
    return null;
  }

  const date: BornDate = { month, day: Number(day) };

  return toReferenceDate(date).getMonth() === month - 1 ? date : null;
}

export function readBornDate(route: ActivatedRouteSnapshot): BornDate | null {
  return parseBornDate(route.paramMap.get(BORN_MONTH_PARAM), route.paramMap.get(BORN_DAY_PARAM));
}

// The date in a leap year, for formatting and date arithmetic.
export function toReferenceDate({ month, day }: BornDate): Date {
  return new Date(REFERENCE_YEAR, month - 1, day);
}

export function toBornDate(date: Date): BornDate {
  return { month: date.getMonth() + 1, day: date.getDate() };
}

// Wraps around the year and passes through February 29.
export function shiftBornDate(date: BornDate, days: number): BornDate {
  return toBornDate(addDays(toReferenceDate(date), days));
}

export function isSameBornDate(first: BornDate, second: BornDate): boolean {
  return first.month === second.month && first.day === second.day;
}

// Splits a formatted date such as "March 3", "3 марта" or "3 de marzo" around the day number, keeping the order and the
// words of the language.
export function splitBornTitle(formatted: string): BornTitlePart[] {
  return formatted
    .split(/(\d+)/)
    .filter((text: string) => text.trim())
    .map((text: string) => ({ text, isDay: /^\d+$/.test(text) }));
}

export function getBornDayPath({ month, day }: BornDate): string {
  return `${BORN_BASE_PATH}/${BORN_MONTH_SLUGS[month - 1]}/${day}`;
}
