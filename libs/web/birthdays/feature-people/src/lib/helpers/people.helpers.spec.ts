import { BirthdayRelationship } from '@birthday/shared-models';
import { Birthday } from '@birthday/web-birthdays-util';
import { PersonRow } from '../types';
import { filterPersonRows, sortPersonRows, toPersonRow } from './people.helpers';

function createRow(name: string, relationship: BirthdayRelationship | null, daysUntil = 0): PersonRow {
  return { birthday: { name, relationship } as Birthday, daysUntil } as PersonRow;
}

function getNames(rows: PersonRow[]): string[] {
  return rows.map((row: PersonRow) => row.birthday.name);
}

describe('toPersonRow', () => {
  const today: Date = new Date(2026, 9, 23);

  it('computes the age when the birth year is known', () => {
    const row: PersonRow = toPersonRow({ name: 'Anna', birthDate: '1990-10-24', relationship: null } as Birthday, today);

    expect(row.hasBirthYear).toBe(true);
    expect(row.age).toBe(35);
  });

  it('returns a null age when the birth year is unknown', () => {
    const row: PersonRow = toPersonRow({ name: 'Anna', birthDate: '0004-10-24', relationship: null } as Birthday, today);

    expect(row.hasBirthYear).toBe(false);
    expect(row.age).toBeNull();
  });
});

describe('filterPersonRows', () => {
  const rows: PersonRow[] = [
    createRow('Anna Smith', 'family'),
    createRow('Boris', 'friends'),
    createRow('Annette', null),
    createRow('Carl', 'family'),
  ];

  it('keeps every row for an empty query and all relationships', () => {
    expect(filterPersonRows(rows, '', 'all')).toEqual(rows);
  });

  it('keeps only rows with the selected relationship', () => {
    expect(getNames(filterPersonRows(rows, '', 'family'))).toEqual(['Anna Smith', 'Carl']);
  });

  it('keeps only rows without a relationship for the none filter', () => {
    expect(getNames(filterPersonRows(rows, '', 'none'))).toEqual(['Annette']);
  });

  it('matches the name case-insensitively and ignores surrounding spaces', () => {
    expect(getNames(filterPersonRows(rows, '  ANN ', 'all'))).toEqual(['Anna Smith', 'Annette']);
  });

  it('keeps only rows that match both the query and the relationship', () => {
    expect(getNames(filterPersonRows(rows, 'ann', 'family'))).toEqual(['Anna Smith']);
    expect(getNames(filterPersonRows(rows, 'ann', 'none'))).toEqual(['Annette']);
  });

  it('returns no rows when nothing matches both conditions', () => {
    expect(filterPersonRows(rows, 'boris', 'family')).toEqual([]);
  });
});

describe('sortPersonRows', () => {
  const rows: PersonRow[] = [
    createRow('Olga', 'other', 3),
    createRow('Nina', null, 1),
    createRow('Cora', 'colleagues', 5),
    createRow('Fred', 'friends', 2),
    createRow('Ben', 'family', 4),
    createRow('Ada', 'family', 6),
    createRow('Mia', null, 0),
  ];

  it('sorts by relationship in the relationship options order, not alphabetically', () => {
    expect(getNames(sortPersonRows(rows, { active: 'relationship', direction: 'asc' }))).toEqual([
      'Ada',
      'Ben',
      'Fred',
      'Cora',
      'Olga',
      'Mia',
      'Nina',
    ]);
  });

  it('reverses the relationship order descending and keeps rows without a relationship last', () => {
    expect(getNames(sortPersonRows(rows, { active: 'relationship', direction: 'desc' }))).toEqual([
      'Olga',
      'Cora',
      'Fred',
      'Ada',
      'Ben',
      'Mia',
      'Nina',
    ]);
  });

  it('falls back to the nearest next birthday first without a sort direction', () => {
    expect(getNames(sortPersonRows(rows, { active: 'relationship', direction: '' }))).toEqual(['Mia', 'Nina', 'Fred', 'Olga', 'Ben', 'Cora', 'Ada']);
  });

  it('does not mutate the input rows', () => {
    const original: string[] = getNames(rows);

    sortPersonRows(rows, { active: 'relationship', direction: 'asc' });

    expect(getNames(rows)).toEqual(original);
  });
});
