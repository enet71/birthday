// Picks whose birthday a notification mentions and builds the notification. Pure, so `deno test` covers it.

const MAX_NAMES_LENGTH = 300;

// The app's languages; keep in sync with `APP_LOCALES` in `libs/web/shared/i18n` and the check on `notification_settings.locale`.
export type NotificationLocale = 'en' | 'es' | 'de' | 'fr' | 'ru' | 'uk';

interface NotificationTexts {
  // The title for one birthday and for several.
  titleToday: [string, string];
  titleTomorrow: [string, string];
  // Prefixes of the body lines.
  today: string;
  tomorrow: string;
  // Ends a cut list of names; `{count}` is the number of names left out.
  more: string;
}

const NOTIFICATION_TEXTS: Record<NotificationLocale, NotificationTexts> = {
  en: {
    titleToday: ['Birthday today', 'Birthdays today'],
    titleTomorrow: ['Birthday tomorrow', 'Birthdays tomorrow'],
    today: 'Today: ',
    tomorrow: 'Tomorrow: ',
    more: ' and {count} more',
  },
  es: {
    titleToday: ['Cumpleaños hoy', 'Cumpleaños hoy'],
    titleTomorrow: ['Cumpleaños mañana', 'Cumpleaños mañana'],
    today: 'Hoy: ',
    tomorrow: 'Mañana: ',
    more: ' y {count} más',
  },
  de: {
    titleToday: ['Geburtstag heute', 'Geburtstage heute'],
    titleTomorrow: ['Geburtstag morgen', 'Geburtstage morgen'],
    today: 'Heute: ',
    tomorrow: 'Morgen: ',
    more: ' und {count} weitere',
  },
  fr: {
    titleToday: ["Anniversaire aujourd'hui", "Anniversaires aujourd'hui"],
    titleTomorrow: ['Anniversaire demain', 'Anniversaires demain'],
    today: "Aujourd'hui : ",
    tomorrow: 'Demain : ',
    more: ' et {count} de plus',
  },
  ru: {
    titleToday: ['Сегодня день рождения', 'Сегодня дни рождения'],
    titleTomorrow: ['Завтра день рождения', 'Завтра дни рождения'],
    today: 'Сегодня: ',
    tomorrow: 'Завтра: ',
    more: ' и ещё {count}',
  },
  uk: {
    titleToday: ['Сьогодні день народження', 'Сьогодні дні народження'],
    titleTomorrow: ['Завтра день народження', 'Завтра дні народження'],
    today: 'Сьогодні: ',
    tomorrow: 'Завтра: ',
    more: ' і ще {count}',
  },
};

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
  locale: NotificationLocale;
}

// The payload the Angular service worker shows as a notification; a click opens or focuses the calendar.
export interface AngularPushPayload {
  notification: {
    title: string;
    body: string;
    lang: string;
    icon: string;
    tag: string;
    data: { onActionClick: { default: { operation: 'navigateLastFocusedOrOpen'; url: string } } };
  };
}

export function buildBirthdayNotification(birthdays: NotifiedBirthday[], options: BirthdayNotificationOptions): AngularPushPayload | null {
  const today = options.remindOnDay ? getNamesOn(birthdays, options.localDate) : [];
  const tomorrow = options.remindDayBefore ? getNamesOn(birthdays, addDays(options.localDate, 1)) : [];
  const texts: NotificationTexts = NOTIFICATION_TEXTS[options.locale] ?? NOTIFICATION_TEXTS.en;
  const lines: string[] = [];

  if (today.length) {
    lines.push(texts.today + joinNames(today, texts.more));
  }
  if (tomorrow.length) {
    lines.push(texts.tomorrow + joinNames(tomorrow, texts.more));
  }
  if (!lines.length) {
    return null;
  }

  return {
    notification: {
      title: today.length ? getTitle(today, texts.titleToday) : getTitle(tomorrow, texts.titleTomorrow),
      body: lines.join('\n'),
      lang: options.locale,
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
export function joinNames(names: string[], more: string = NOTIFICATION_TEXTS.en.more, maxLength = MAX_NAMES_LENGTH): string {
  let joined = names[0];
  let count = 1;

  while (count < names.length && joined.length + names[count].length + 2 <= maxLength) {
    joined += `, ${names[count]}`;
    count++;
  }

  return count < names.length ? joined + more.replace('{count}', String(names.length - count)) : joined;
}

function getTitle(names: string[], [single, several]: [string, string]): string {
  return names.length > 1 ? several : single;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
