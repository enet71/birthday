import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthClient } from '@birthday/web-auth-data-access';
import { NotificationsService } from '@birthday/web-shared-util';
import { Birthday, UpcomingBirthday } from '@birthday/web-birthdays-util';
import { BirthdaysDataService, BirthdaysLocalStorageService } from '../services';
import { BirthdaysController } from './birthdays.controller';
import { BirthdaysState } from './birthdays.state';

describe('BirthdaysController', () => {
  let controller: BirthdaysController;
  let state: BirthdaysState;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // State computes `today` at construction, so the time is set before injecting it.
    vi.setSystemTime(new Date(2026, 9, 23, 14, 30));
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthClient, useValue: { userChanges: () => of(null) } },
        BirthdaysState,
        BirthdaysController,
        {
          provide: BirthdaysDataService,
          useExisting: BirthdaysLocalStorageService,
        },
        {
          provide: NotificationsService,
          useValue: { createErrorNotification: vi.fn() },
        },
      ],
    });
    controller = TestBed.inject(BirthdaysController);
    state = TestBed.inject(BirthdaysState);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('addBirthday', () => {
    it('appends a birthday with a trimmed name and a yyyy-MM-dd birth date', () => {
      controller.addBirthday('  Liam  ', new Date(1999, 9, 25, 18, 45)).subscribe();

      expect(state.birthdays()).toEqual([{ id: expect.any(String), name: 'Liam', birthDate: '1999-10-25' }]);
    });

    it('gives every added birthday a unique id', () => {
      controller.addBirthday('Liam', new Date(1999, 9, 25)).subscribe();
      controller.addBirthday('Liam', new Date(1999, 9, 25)).subscribe();

      const ids: string[] = state.birthdays().map((birthday: Birthday) => birthday.id);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('updates upcoming birthdays with the added birthday', () => {
      controller.addBirthday('Liam', new Date(1999, 9, 25)).subscribe();

      const first: UpcomingBirthday = state.upcomingBirthdays()[0];

      expect(first.birthday.name).toBe('Liam');
      expect(first.date).toEqual(new Date(2026, 9, 25));
      expect(first.daysUntil).toBe(2);
    });
  });

  it('clears the birthdays when the state is reset after adding', () => {
    controller.addBirthday('Liam', new Date(1999, 9, 25)).subscribe();

    state.resetState();

    expect(state.birthdays()).toEqual([]);
  });
});
