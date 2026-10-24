import {
  differenceInCalendarDays,
  format,
  getDaysInMonth,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import { Birthday, UpcomingBirthday } from '../types';

export function toBirthDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getBirthdayInYear(birthDate: string, year: number): Date {
  const date: Date = parseISO(birthDate);
  const month: number = date.getMonth();
  // A Feb 29 birthday is celebrated on Feb 28 in non-leap years.
  const day: number = Math.min(
    date.getDate(),
    getDaysInMonth(new Date(year, month)),
  );

  return new Date(year, month, day);
}

export function isBirthdayOn(birthDate: string, day: Date): boolean {
  return isSameDay(getBirthdayInYear(birthDate, day.getFullYear()), day);
}

export function getNextBirthday(birthDate: string, from: Date): Date {
  const today: Date = startOfDay(from);
  const birthday: Date = getBirthdayInYear(birthDate, today.getFullYear());

  return isBefore(birthday, today)
    ? getBirthdayInYear(birthDate, today.getFullYear() + 1)
    : birthday;
}

export function getUpcomingBirthdays(
  birthdays: Birthday[],
  from: Date,
): UpcomingBirthday[] {
  return birthdays
    .map((birthday: Birthday): UpcomingBirthday => {
      const date: Date = getNextBirthday(birthday.birthDate, from);

      return {
        birthday,
        date,
        daysUntil: differenceInCalendarDays(date, from),
      };
    })
    .sort(
      (a: UpcomingBirthday, b: UpcomingBirthday) =>
        a.daysUntil - b.daysUntil ||
        a.birthday.name.localeCompare(b.birthday.name),
    );
}
