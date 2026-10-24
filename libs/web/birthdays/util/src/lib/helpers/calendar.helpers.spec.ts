import { differenceInCalendarDays } from 'date-fns';
import { getMonthGridDays } from './calendar.helpers';

const SUNDAY = 0;
const SATURDAY = 6;

describe('getMonthGridDays', () => {
  it('covers October 2026 with full weeks from Sep 27 to Oct 31', () => {
    const days: Date[] = getMonthGridDays(new Date(2026, 9, 15));

    expect(days).toHaveLength(35);
    expect(days[0]).toEqual(new Date(2026, 8, 27));
    expect(days[days.length - 1]).toEqual(new Date(2026, 9, 31));
  });

  it('starts the grid on the 1st when the month starts on Sunday', () => {
    const days: Date[] = getMonthGridDays(new Date(2026, 10, 1));

    expect(days).toHaveLength(35);
    expect(days[0]).toEqual(new Date(2026, 10, 1));
    expect(days[days.length - 1]).toEqual(new Date(2026, 11, 5));
  });

  it('returns six weeks for a month that spans six weeks', () => {
    const days: Date[] = getMonthGridDays(new Date(2026, 7, 31));

    expect(days).toHaveLength(42);
    expect(days[0]).toEqual(new Date(2026, 6, 26));
    expect(days[days.length - 1]).toEqual(new Date(2026, 8, 5));
  });

  it('returns exactly four weeks for a 28-day month from Sunday to Saturday', () => {
    const days: Date[] = getMonthGridDays(new Date(2026, 1, 10));

    expect(days).toHaveLength(28);
    expect(days[0]).toEqual(new Date(2026, 1, 1));
    expect(days[days.length - 1]).toEqual(new Date(2026, 1, 28));
  });

  it.each([
    new Date(2026, 0, 1),
    new Date(2026, 1, 1),
    new Date(2026, 9, 1),
    new Date(2028, 1, 29),
  ])(
    'returns consecutive days from Sunday to Saturday covering the month of %s',
    (month: Date) => {
      const days: Date[] = getMonthGridDays(month);
      const monthDays: Date[] = days.filter(
        (day: Date) => day.getMonth() === month.getMonth(),
      );
      const daysInMonth: number = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0,
      ).getDate();

      expect(days.length % 7).toBe(0);
      expect(days[0].getDay()).toBe(SUNDAY);
      expect(days[days.length - 1].getDay()).toBe(SATURDAY);
      expect(monthDays).toHaveLength(daysInMonth);
      days.slice(1).forEach((day: Date, index: number) => {
        expect(differenceInCalendarDays(day, days[index])).toBe(1);
      });
    },
  );
});
