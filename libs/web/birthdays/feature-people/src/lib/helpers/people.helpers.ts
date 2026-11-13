import { Sort } from '@angular/material/sort';
import { differenceInCalendarDays, differenceInYears, format, parseISO } from 'date-fns';
import { Birthday, getNextBirthday, hasBirthYear, RELATIONSHIP_OPTIONS, RelationshipOption } from '@birthday/web-birthdays-util';
import { PeopleSortColumn, PersonRow, RelationshipFilter } from '../types';

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

export function filterPersonRows(rows: PersonRow[], query: string, relationship: RelationshipFilter): PersonRow[] {
  const normalizedQuery: string = query.trim().toLocaleLowerCase();

  return rows.filter((row: PersonRow) => row.birthday.name.toLocaleLowerCase().includes(normalizedQuery) && matchesRelationship(row, relationship));
}

// Without a sort direction the rows keep the default order: the nearest birthday first. Rows without a relationship
// stay last in both directions.
export function sortPersonRows(rows: PersonRow[], { active, direction }: Sort): PersonRow[] {
  const column: PeopleSortColumn = direction ? (active as PeopleSortColumn) : 'nextBirthday';
  const sign: number = direction === 'desc' ? -1 : 1;

  return [...rows].sort((a: PersonRow, b: PersonRow) => {
    const isAMissing: boolean = isValueMissing(a, column);
    const isBMissing: boolean = isValueMissing(b, column);

    if (isAMissing || isBMissing) {
      return Number(isAMissing) - Number(isBMissing) || compareNames(a, b);
    }

    return sign * compareByColumn(a, b, column) || compareNames(a, b);
  });
}

function compareByColumn(a: PersonRow, b: PersonRow, column: PeopleSortColumn): number {
  switch (column) {
    case 'name':
      return compareNames(a, b);
    case 'relationship':
      return getRelationshipOrder(a) - getRelationshipOrder(b);
    case 'birthday':
      return getCalendarKey(a).localeCompare(getCalendarKey(b));
    case 'nextBirthday':
      return a.daysUntil - b.daysUntil;
  }
}

function matchesRelationship({ birthday }: PersonRow, relationship: RelationshipFilter): boolean {
  switch (relationship) {
    case 'all':
      return true;
    case 'none':
      return birthday.relationship === null;
    default:
      return birthday.relationship === relationship;
  }
}

function isValueMissing(row: PersonRow, column: PeopleSortColumn): boolean {
  return column === 'relationship' && row.birthday.relationship === null;
}

// Follows the order of the relationship options rather than the translated labels, so it is the same in every language.
function getRelationshipOrder({ birthday }: PersonRow): number {
  return RELATIONSHIP_OPTIONS.findIndex((option: RelationshipOption) => option.value === birthday.relationship);
}

function compareNames(a: PersonRow, b: PersonRow): number {
  return a.birthday.name.localeCompare(b.birthday.name);
}

// Orders birthdays through the calendar year, so a missing birth year does not move a row to the start.
function getCalendarKey({ birthDate }: PersonRow): string {
  return format(birthDate, 'MM-dd-yyyy');
}
