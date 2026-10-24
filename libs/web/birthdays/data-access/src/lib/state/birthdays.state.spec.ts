import { TestBed } from '@angular/core/testing';
import { Birthday, UpcomingBirthday } from '@birthday/web-birthdays-util';
import { BirthdaysState } from './birthdays.state';

const BIRTHDAYS: Birthday[] = [
  { id: 'emma', name: 'Emma', birthDate: '1994-10-06' },
  { id: 'sarah', name: 'Sarah', birthDate: '1990-10-26' },
  { id: 'alex', name: 'Alex', birthDate: '1992-11-05' },
];

describe('BirthdaysState', () => {
  let state: BirthdaysState;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // State computes `today` at construction, so the time is set before injecting it.
    vi.setSystemTime(new Date(2026, 9, 23, 14, 30));

    TestBed.configureTestingModule({ providers: [BirthdaysState] });
    state = TestBed.inject(BirthdaysState);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets today to the start of the current day', () => {
    expect(state.today).toEqual(new Date(2026, 9, 23));
  });

  it('starts without birthdays', () => {
    expect(state.birthdays()).toEqual([]);
    expect(state.upcomingBirthdays()).toEqual([]);
  });

  it('derives upcoming birthdays from the birthdays and today', () => {
    state.birthdays.set(BIRTHDAYS);

    const upcoming: [string, number][] = state
      .upcomingBirthdays()
      .map((item: UpcomingBirthday) => [item.birthday.id, item.daysUntil]);

    expect(upcoming).toEqual([
      ['sarah', 3],
      ['alex', 13],
      ['emma', 348],
    ]);
  });

  it('recomputes upcoming birthdays when the birthdays change', () => {
    state.birthdays.set([
      { id: 'today', name: 'Today', birthDate: '2000-10-23' },
    ]);

    expect(state.upcomingBirthdays()).toEqual([
      {
        birthday: { id: 'today', name: 'Today', birthDate: '2000-10-23' },
        date: new Date(2026, 9, 23),
        daysUntil: 0,
      },
    ]);
  });

  it('clears the birthdays on reset', () => {
    state.birthdays.set(BIRTHDAYS);

    state.resetState();

    expect(state.birthdays()).toEqual([]);
    expect(state.upcomingBirthdays()).toEqual([]);
  });
});
