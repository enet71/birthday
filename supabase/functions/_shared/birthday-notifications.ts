// Picks whose birthday a notification mentions and builds the notification. Pure, so `deno test` covers it.

const MAX_NAMES_LENGTH = 300;

export interface NotifiedBirthday {
  name: string;
  // `yyyy-MM-dd`; the year 0004 marks an unknown birth year.
  birth_date: string;
}

export interface BirthdayNotificationOptions {
  // The user's local date, `yyyy-MM-dd`.
  localDate: string;
  remindOnDay: boolean;
  remindDayBefore: boolean;
}

// The payload the Angular service worker shows as a notification; a click opens or focuses the calendar.
export interface AngularPushPayload {
  notification: {
    title: string;
    body: string;
    icon: string;
    tag: string;
    data: { onActionClick: { default: { operation: 'navigateLastFocusedOrOpen'; url: string } } };
  };
}

export function buildBirthdayNotification(birthdays: NotifiedBirthday[], options: BirthdayNotificationOptions): AngularPushPayload | null {
  const today = options.remindOnDay ? getNamesOn(birthdays, options.localDate) : [];
  const tomorrow = options.remindDayBefore ? getNamesOn(birthdays, addDays(options.localDate, 1)) : [];
  const lines: string[] = [];

  if (today.length) {
    lines.push(`Today: ${joinNames(today)}`);
  }
  if (tomorrow.length) {
    lines.push(`Tomorrow: ${joinNames(tomorrow)}`);
  }
  if (!lines.length) {
    return null;
  }

  return {
    notification: {
      title: today.length ? getTitle(today, 'today') : getTitle(tomorrow, 'tomorrow'),
      body: lines.join('\n'),
      icon: '/icon-192.png',
      // A later notification for the same day replaces this one instead of stacking.
      tag: `birthdays-${options.localDate}`,
      data: { onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url: '/' } } },
    },
  };
}

// In other years a Feb 29 birthday falls on Feb 28, as in Google Calendar.
export function getNamesOn(birthdays: NotifiedBirthday[], date: string): string[] {
  const [year, month, day] = date.split('-').map(Number);
  const includesLeapDay = month === 2 && day === 28 && !isLeapYear(year);

  return birthdays
    .filter((birthday: NotifiedBirthday) => {
      const [, birthMonth, birthDay] = birthday.birth_date.split('-').map(Number);

      return birthMonth === month && (birthDay === day || (includesLeapDay && birthDay === 29));
    })
    .map((birthday: NotifiedBirthday) => birthday.name)
    .sort((a: string, b: string) => a.localeCompare(b));
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// Push services accept about 4 KB of encrypted payload, and a notification shows only a few lines anyway.
export function joinNames(names: string[], maxLength = MAX_NAMES_LENGTH): string {
  let joined = names[0];
  let count = 1;

  while (count < names.length && joined.length + names[count].length + 2 <= maxLength) {
    joined += `, ${names[count]}`;
    count++;
  }

  return count < names.length ? `${joined} and ${names.length - count} more` : joined;
}

function getTitle(names: string[], day: 'today' | 'tomorrow'): string {
  return `${names.length > 1 ? 'Birthdays' : 'Birthday'} ${day}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
