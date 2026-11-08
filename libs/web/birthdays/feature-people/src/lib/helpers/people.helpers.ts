import { Sort } from '@angular/material/sort';
import { differenceInCalendarDays, differenceInYears, format, parseISO } from 'date-fns';
import { Birthday, getNextBirthday, hasBirthYear } from '@birthday/web-birthdays-util';
import { PeopleSortColumn, PersonRow } from '../types';

export function toPersonRow(birthday: Birthday, today: Date): PersonRow {
  const birthDate: Date = parseISO(birthday.birthDate);
  const isYearKnown: boolean = hasBirthYear(birthday.birthDate);
  const nextBirthday: Date = getNextBirthday(birthday.birthDate, today);
  const age: number = differenceInYears(today, birthDate);

  return {
    birthday,
    birthDate,
    hasBirthYear: isYearKnown,
    // A birth date in the future has no meaningful age.
    age: isYearKnown && age >= 0 ? age : null,
    nextBirthday,
    daysUntil: differenceInCalendarDays(nextBirthday, today),
  };
}

export function filterPersonRows(rows: PersonRow[], query: string): PersonRow[] {
  const normalizedQuery: string = query.trim().toLocaleLowerCase();

  return normalizedQuery ? rows.filter((row: PersonRow) => row.birthday.name.toLocaleLowerCase().includes(normalizedQuery)) : rows;
}

// Without a sort direction the rows keep the default order: the nearest birthday first. Rows without an age stay last
// in both directions.
export function sortPersonRows(rows: PersonRow[], { active, direction }: Sort): PersonRow[] {
  const column: PeopleSortColumn = direction ? (active as PeopleSortColumn) : 'nextBirthday';
  const sign: number = direction === 'desc' ? -1 : 1;

  return [...rows].sort((a: PersonRow, b: PersonRow) => {
    if (column === 'age' && (a.age === null || b.age === null)) {
      return Number(a.age === null) - Number(b.age === null) || compareNames(a, b);
    }

    return sign * compareByColumn(a, b, column) || compareNames(a, b);
  });
}

function compareByColumn(a: PersonRow, b: PersonRow, column: PeopleSortColumn): number {
  switch (column) {
    case 'name':
      return compareNames(a, b);
    case 'birthday':
      return getCalendarKey(a).localeCompare(getCalendarKey(b));
    case 'age':
      return (a.age ?? 0) - (b.age ?? 0);
    case 'nextBirthday':
      return a.daysUntil - b.daysUntil;
  }
}

function compareNames(a: PersonRow, b: PersonRow): number {
  return a.birthday.name.localeCompare(b.birthday.name);
}

// Orders birthdays through the calendar year, so a missing birth year does not move a row to the start.
function getCalendarKey({ birthDate }: PersonRow): string {
  return format(birthDate, 'MM-dd-yyyy');
}
