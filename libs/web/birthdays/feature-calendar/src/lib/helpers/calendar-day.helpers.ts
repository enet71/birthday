import { Birthday } from '@birthday/web-birthdays-util';
import { AppTranslateService } from '@birthday/web-shared-i18n';
import { CalendarDay } from '../types';

export function getBirthdayNames(day: CalendarDay): string {
  return day.birthdays.map((birthday: Birthday) => birthday.name).join(', ');
}

export function getCalendarDayLabel(day: CalendarDay, translator: AppTranslateService): string {
  const date: string = translator.formatDate(day.date, 'dates.longDate');

  if (!day.birthdays.length) {
    return translator.translate('calendar.dayLabel', { date });
  }

  return translator.translate('calendar.dayLabelWithBirthdays', { date, names: getBirthdayNames(day) });
}
