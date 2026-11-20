import { AppLocale } from '@birthday/shared-models';
import { AngularPushPayload } from '../types';

interface InviteSubmissionTexts {
  title: string;
  // `{name}` is the guest's name.
  body: string;
}

const INVITE_SUBMISSION_TEXTS: Record<AppLocale, InviteSubmissionTexts> = {
  en: { title: 'New birthday request', body: '{name} wants to be added to your calendar' },
  es: { title: 'Nueva solicitud de cumpleaños', body: '{name} quiere estar en tu calendario' },
  de: { title: 'Neue Geburtstagsanfrage', body: '{name} möchte in deinen Kalender aufgenommen werden' },
  fr: { title: "Nouvelle demande d'anniversaire", body: '{name} souhaite rejoindre votre calendrier' },
  ru: { title: 'Новая заявка на день рождения', body: '{name} хочет попасть в ваш календарь' },
  uk: { title: 'Нова заявка на день народження', body: '{name} хоче потрапити до вашого календаря' },
};

// A click opens the people page, where the requests are.
export function buildInviteSubmissionNotification(name: string, locale: AppLocale): AngularPushPayload {
  const texts = INVITE_SUBMISSION_TEXTS[locale] ?? INVITE_SUBMISSION_TEXTS.en;

  return {
    notification: {
      title: texts.title,
      body: texts.body.replace('{name}', () => name),
      lang: locale,
      icon: '/icon-192.png',
      // A newer request replaces the shown one instead of stacking; the page lists them all.
      tag: 'invite-submissions',
      data: { onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url: '/people' } } },
    },
  };
}
