import { AppLocale } from '@birthday/shared-models';

export interface NotificationsModuleOptions {
  // The VAPID pair from `npm run push:vapid-keys`, base64url.
  vapidPublicKey: string;
  vapidPrivateKey: string;
  // A `mailto:` or `https:` contact for push services.
  vapidSubject: string;
}

// A user whose chosen hour has come, claimed for their local date.
export interface DueUser {
  userId: string;
  // `yyyy-MM-dd`.
  localDate: string;
  remindOnDay: boolean;
  remindDayBefore: boolean;
  locale: AppLocale;
}

export interface NotifiedBirthday {
  name: string;
  // `yyyy-MM-dd`; the year 0004 marks an unknown birth year.
  birthDate: string;
}

export interface BirthdayNotificationOptions {
  // The user's local date, `yyyy-MM-dd`.
  localDate: string;
  remindOnDay: boolean;
  remindDayBefore: boolean;
  locale: AppLocale;
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

export interface StoredPushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// `gone`: the push service will never accept this subscription again, so it is deleted.
export type PushResult = 'sent' | 'gone' | 'failed';
