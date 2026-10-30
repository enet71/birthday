import { Birthday, UpcomingBirthday } from '../types';
import { getBirthdayInYear, getNextBirthday, getUpcomingBirthdays, isBirthdayOn, toBirthDate } from './birthday.helpers';

describe('toBirthDate', () => {
  it('formats a date as yyyy-MM-dd with zero padding', () => {
    expect(toBirthDate(new Date(2026, 0, 5), true)).toBe('2026-01-05');
  });

  it('uses the local calendar day and ignores the time of day', () => {
    expect(toBirthDate(new Date(2026, 9, 23, 23, 59, 59), true)).toBe('2026-10-23');
  });
});

describe('getBirthdayInYear', () => {
  it('returns the birthday month and day in the given year', () => {
    expect(getBirthdayInYear('1994-10-06', 2026)).toEqual(new Date(2026, 9, 6));
  });

  it('moves a Feb 29 birthday to Feb 28 in a non-leap year', () => {
    expect(getBirthdayInYear('2000-02-29', 2027)).toEqual(new Date(2027, 1, 28));
  });

  it('keeps a Feb 29 birthday on Feb 29 in a leap year', () => {
    expect(getBirthdayInYear('2000-02-29', 2028)).toEqual(new Date(2028, 1, 29));
  });
});

describe('isBirthdayOn', () => {
  it('returns true on the birthday regardless of the time of day', () => {
    expect(isBirthdayOn('1994-10-06', new Date(2026, 9, 6, 18, 30))).toBe(true);
  });

  it('returns false on a different day', () => {
    expect(isBirthdayOn('1994-10-06', new Date(2026, 9, 7))).toBe(false);
  });

  it('treats Feb 28 as the birthday of a Feb 29 birthday in a non-leap year', () => {
    expect(isBirthdayOn('2000-02-29', new Date(2027, 1, 28))).toBe(true);
    expect(isBirthdayOn('2000-02-29', new Date(2027, 2, 1))).toBe(false);
  });

  it('does not treat Feb 28 as the birthday of a Feb 29 birthday in a leap year', () => {
    expect(isBirthdayOn('2000-02-29', new Date(2028, 1, 28))).toBe(false);
    expect(isBirthdayOn('2000-02-29', new Date(2028, 1, 29))).toBe(true);
  });
});

describe('getNextBirthday', () => {
  it('returns today when the birthday is today, even later in the day', () => {
    expect(getNextBirthday('1990-10-23', new Date(2026, 9, 23, 22, 15))).toEqual(new Date(2026, 9, 23));
  });

  it('returns the birthday in the current year when it is still ahead', () => {
    expect(getNextBirthday('1990-10-26', new Date(2026, 9, 23))).toEqual(new Date(2026, 9, 26));
  });

  it('rolls a birthday that has already passed to the next year', () => {
    expect(getNextBirthday('1994-10-06', new Date(2026, 9, 23))).toEqual(new Date(2027, 9, 6));
  });

  it('wraps from December to a January birthday in the next year', () => {
    expect(getNextBirthday('1985-01-05', new Date(2026, 11, 20))).toEqual(new Date(2027, 0, 5));
  });

  it('returns Feb 29 of the next leap year after a non-leap Feb 28 has passed', () => {
    expect(getNextBirthday('2000-02-29', new Date(2027, 2, 1))).toEqual(new Date(2028, 1, 29));
  });
});

describe('getUpcomingBirthdays', () => {
  const from: Date = new Date(2026, 9, 23, 9, 0);

  it('returns an empty list when there are no birthdays', () => {
    expect(getUpcomingBirthdays([], from)).toEqual([]);
  });

  it('sorts birthdays by days until the next birthday', () => {
    const birthdays: Birthday[] = [
      { id: 'past', name: 'Past', birthDate: '1994-10-06' },
      { id: 'soon', name: 'Soon', birthDate: '1990-10-26' },
      { id: 'later', name: 'Later', birthDate: '1992-11-05' },
    ];

    const upcoming: UpcomingBirthday[] = getUpcomingBirthdays(birthdays, from);

    expect(upcoming).toEqual([
      { birthday: birthdays[1], date: new Date(2026, 9, 26), daysUntil: 3 },
      { birthday: birthdays[2], date: new Date(2026, 10, 5), daysUntil: 13 },
      { birthday: birthdays[0], date: new Date(2027, 9, 6), daysUntil: 348 },
    ]);
  });

  it('puts a birthday that is today first with zero days until', () => {
    const birthdays: Birthday[] = [
      { id: 'soon', name: 'Soon', birthDate: '1990-10-26' },
      { id: 'today', name: 'Today', birthDate: '2001-10-23' },
    ];

    const upcoming: UpcomingBirthday[] = getUpcomingBirthdays(birthdays, from);

    expect(upcoming[0]).toEqual({
      birthday: birthdays[1],
      date: new Date(2026, 9, 23),
      daysUntil: 0,
    });
  });

  it('orders birthdays on the same day by name', () => {
    const birthdays: Birthday[] = [
      { id: 'zoe', name: 'Zoe', birthDate: '1990-10-26' },
      { id: 'anna', name: 'Anna', birthDate: '1985-10-26' },
      { id: 'mia', name: 'Mia', birthDate: '2000-10-26' },
    ];

    const names: string[] = getUpcomingBirthdays(birthdays, from).map((upcoming: UpcomingBirthday) => upcoming.birthday.name);

    expect(names).toEqual(['Anna', 'Mia', 'Zoe']);
  });

  it('does not mutate the input list', () => {
    const birthdays: Birthday[] = [
      { id: 'later', name: 'Later', birthDate: '1992-11-05' },
      { id: 'soon', name: 'Soon', birthDate: '1990-10-26' },
    ];

    getUpcomingBirthdays(birthdays, from);

    expect(birthdays.map((birthday: Birthday) => birthday.id)).toEqual(['later', 'soon']);
  });
});
