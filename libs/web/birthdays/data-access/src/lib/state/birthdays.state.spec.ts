import { TestBed } from '@angular/core/testing';
import { UpcomingBirthday } from '@birthday/web-birthdays-util';
import { BIRTHDAYS_MOCK } from '../constants';
import { BirthdaysState } from './birthdays.state';

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

  it('derives upcoming birthdays from the birthdays and today', () => {
    const upcoming: [string, number][] = state
      .upcomingBirthdays()
      .map((item: UpcomingBirthday) => [item.birthday.id, item.daysUntil]);

    expect(upcoming).toEqual([
      ['sarah', 3],
      ['sophie', 6],
      ['mom', 7],
      ['alex', 13],
      ['max', 26],
      ['emma', 348],
      ['dad', 354],
      ['olivia', 359],
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

  it('restores the mock birthdays on reset', () => {
    state.birthdays.set([]);

    state.resetState();

    expect(state.birthdays()).toEqual(BIRTHDAYS_MOCK);
    expect(state.upcomingBirthdays()).toHaveLength(BIRTHDAYS_MOCK.length);
  });
});
