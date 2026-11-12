import { assertEquals } from 'jsr:@std/assert';
import { buildBirthdayNotification, joinNames, type NotificationLocale, type NotifiedBirthday } from './birthday-notifications.ts';

const LOCAL_DATE = '2026-10-25';
const ANNA: NotifiedBirthday = { name: 'Anna', birth_date: '1990-10-25' };
const BORIS: NotifiedBirthday = { name: 'Boris', birth_date: '0004-10-25' };
const CLARA: NotifiedBirthday = { name: 'Clara', birth_date: '1985-10-26' };
const DAN: NotifiedBirthday = { name: 'Dan', birth_date: '2001-10-26' };

function build(birthdays: NotifiedBirthday[], locale: NotificationLocale) {
  return buildBirthdayNotification(birthdays, { localDate: LOCAL_DATE, remindOnDay: true, remindDayBefore: true, locale });
}

Deno.test('builds the texts in each language for one birthday today and one tomorrow', () => {
  const expected: Record<NotificationLocale, { title: string; body: string }> = {
    en: { title: 'Birthday today', body: 'Today: Anna\nTomorrow: Clara' },
    es: { title: 'Cumpleaños hoy', body: 'Hoy: Anna\nMañana: Clara' },
    de: { title: 'Geburtstag heute', body: 'Heute: Anna\nMorgen: Clara' },
    fr: { title: "Anniversaire aujourd'hui", body: "Aujourd'hui : Anna\nDemain : Clara" },
    ru: { title: 'Сегодня день рождения', body: 'Сегодня: Anna\nЗавтра: Clara' },
    uk: { title: 'Сьогодні день народження', body: 'Сьогодні: Anna\nЗавтра: Clara' },
  };

  for (const [locale, texts] of Object.entries(expected) as [NotificationLocale, { title: string; body: string }][]) {
    const notification = build([ANNA, CLARA], locale)?.notification;

    assertEquals(notification?.title, texts.title, locale);
    assertEquals(notification?.body, texts.body, locale);
    assertEquals(notification?.lang, locale);
  }
});

Deno.test('uses the plural title for several birthdays today', () => {
  assertEquals(build([BORIS, ANNA], 'de')?.notification.title, 'Geburtstage heute');
  assertEquals(build([BORIS, ANNA], 'ru')?.notification.body, 'Сегодня: Anna, Boris');
});

Deno.test('uses the tomorrow title when nobody has a birthday today', () => {
  assertEquals(build([CLARA], 'fr')?.notification.title, 'Anniversaire demain');
  assertEquals(build([CLARA, DAN], 'fr')?.notification.title, 'Anniversaires demain');
  assertEquals(build([CLARA, DAN], 'uk')?.notification.body, 'Завтра: Clara, Dan');
});

Deno.test('falls back to English texts for an unknown locale', () => {
  const notification = build([ANNA, CLARA], 'pt' as NotificationLocale)?.notification;

  assertEquals(notification?.title, 'Birthday today');
  assertEquals(notification?.body, 'Today: Anna\nTomorrow: Clara');
});

Deno.test('returns null when nobody has a birthday on the reminded days', () => {
  assertEquals(build([{ name: 'Eve', birth_date: '1990-01-01' }], 'es'), null);
});

Deno.test('joinNames ends a cut list with the localized "more" suffix', () => {
  assertEquals(joinNames(['Anna', 'Boris', 'Clara'], ' и ещё {count}', 11), 'Anna, Boris и ещё 1');
  assertEquals(joinNames(['Anna', 'Boris', 'Clara'], ' und {count} weitere', 4), 'Anna und 2 weitere');
});

Deno.test('joinNames uses the English suffix by default and no suffix when every name fits', () => {
  assertEquals(joinNames(['Anna', 'Boris', 'Clara'], undefined, 4), 'Anna and 2 more');
  assertEquals(joinNames(['Anna', 'Boris'], ' y {count} más'), 'Anna, Boris');
});

Deno.test('cuts a long body with the suffix of the user language', () => {
  const birthdays: NotifiedBirthday[] = Array.from({ length: 40 }, (_: unknown, index: number) => ({
    name: `Person number ${String(index).padStart(2, '0')}`,
    birth_date: '1990-10-25',
  }));

  const body = build(birthdays, 'es')?.notification.body ?? '';

  assertEquals(body.startsWith('Hoy: Person number 00, '), true);
  assertEquals(/ y \d+ más$/.test(body), true);
});
