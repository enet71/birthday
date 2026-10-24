import { TestBed } from '@angular/core/testing';
import { Birthday, UpcomingBirthday } from '@birthday/web-birthdays-util';
import { BIRTHDAYS_MOCK } from '../constants';
import { BirthdaysController } from './birthdays.controller';
import { BirthdaysState } from './birthdays.state';

describe('BirthdaysController', () => {
  let controller: BirthdaysController;
  let state: BirthdaysState;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // State computes `today` at construction, so the time is set before injecting it.
    vi.setSystemTime(new Date(2026, 9, 23, 14, 30));

    TestBed.configureTestingModule({
      providers: [BirthdaysState, BirthdaysController],
    });
    controller = TestBed.inject(BirthdaysController);
    state = TestBed.inject(BirthdaysState);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addBirthday', () => {
    it('appends a birthday with a trimmed name and a yyyy-MM-dd birth date', () => {
      controller.addBirthday('  Liam  ', new Date(1999, 9, 25, 18, 45));

      const birthdays: Birthday[] = state.birthdays();
      const added: Birthday = birthdays[birthdays.length - 1];

      expect(birthdays).toHaveLength(BIRTHDAYS_MOCK.length + 1);
      expect(birthdays.slice(0, -1)).toEqual(BIRTHDAYS_MOCK);
      expect(added).toEqual({
        id: expect.any(String),
        name: 'Liam',
        birthDate: '1999-10-25',
      });
    });

    it('gives every added birthday a unique id', () => {
      controller.addBirthday('Liam', new Date(1999, 9, 25));
      controller.addBirthday('Liam', new Date(1999, 9, 25));

      const ids: string[] = state
        .birthdays()
        .map((birthday: Birthday) => birthday.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('updates upcoming birthdays with the added birthday', () => {
      controller.addBirthday('Liam', new Date(1999, 9, 25));

      const first: UpcomingBirthday = state.upcomingBirthdays()[0];

      expect(first.birthday.name).toBe('Liam');
      expect(first.date).toEqual(new Date(2026, 9, 25));
      expect(first.daysUntil).toBe(2);
    });

    it('does not change the mock birthdays', () => {
      const mockIds: string[] = BIRTHDAYS_MOCK.map(
        (birthday: Birthday) => birthday.id,
      );

      controller.addBirthday('Liam', new Date(1999, 9, 25));

      expect(BIRTHDAYS_MOCK.map((birthday: Birthday) => birthday.id)).toEqual(
        mockIds,
      );
    });
  });

  it('restores the mock birthdays when the state is reset after adding', () => {
    controller.addBirthday('Liam', new Date(1999, 9, 25));

    state.resetState();

    expect(state.birthdays()).toEqual(BIRTHDAYS_MOCK);
    expect(
      state
        .upcomingBirthdays()
        .some((item: UpcomingBirthday) => item.birthday.name === 'Liam'),
    ).toBe(false);
  });
});
