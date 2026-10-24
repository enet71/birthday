import { format } from 'date-fns';
import { Birthday } from '@birthday/web-birthdays-util';
import { CalendarDay } from '../types';

export function getBirthdayNames(day: CalendarDay): string {
  return day.birthdays.map((birthday: Birthday) => birthday.name).join(', ');
}

export function getCalendarDayLabel(day: CalendarDay): string {
  const date: string = format(day.date, 'MMMM d, y');

  if (!day.birthdays.length) {
    return `${date}. Add birthday`;
  }

  return `${date}, birthdays: ${getBirthdayNames(day)}. Add birthday`;
}
