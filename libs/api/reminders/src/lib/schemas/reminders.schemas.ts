import { z } from 'zod';
import {
  APP_LOCALES,
  DevicePushSubscriptionDto,
  PushSubscriptionEndpointRequest,
  REMINDER_DAYS,
  ReminderDevicePreferencesRequest,
  ReminderLocaleRequest,
  ReminderSettingsDto,
} from '@birthday/shared-models';

// The same limits as the database checks.
export const TIME_ZONE_MESSAGE = 'Must be an IANA time zone, such as Europe/Berlin';
const PUSH_ENDPOINT_MAX = 2048;
const PUSH_KEY_MAX = 256;
// Only the browsers' push services: the server sends notifications to this URL, so it must not reach anything else.
const PUSH_ENDPOINT = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)\//;

const days = z.enum(REMINDER_DAYS);
const hour = z.number().int().min(0).max(23);
// The database also checks the name against Postgres's own list; ReminderSettingsService answers that with 400 too.
const timeZone = z.string().min(1).max(100).refine(isTimeZone, TIME_ZONE_MESSAGE);
const locale = z.enum(APP_LOCALES);

export const reminderSettingsSchema = z.strictObject({ days, hour, timeZone, locale }) satisfies z.ZodType<ReminderSettingsDto>;

export const devicePreferencesSchema = z.strictObject({ timeZone, locale }) satisfies z.ZodType<ReminderDevicePreferencesRequest>;

export const reminderLocaleSchema = z.strictObject({ locale }) satisfies z.ZodType<ReminderLocaleRequest>;

// Saved endpoints must belong to a push service; lookups and deletes only compare with saved rows, so they accept any
// endpoint the browser holds and simply find nothing.
const endpoint = z.string().min(1).max(PUSH_ENDPOINT_MAX);
const pushServiceEndpoint = endpoint.regex(PUSH_ENDPOINT, 'Must be the URL of a browser push service');
const pushKey = z.string().min(1).max(PUSH_KEY_MAX);

export const pushSubscriptionSchema = z.strictObject({
  endpoint: pushServiceEndpoint,
  p256dh: pushKey,
  auth: pushKey,
}) satisfies z.ZodType<DevicePushSubscriptionDto>;

export const pushSubscriptionEndpointSchema = z.strictObject({ endpoint }) satisfies z.ZodType<PushSubscriptionEndpointRequest>;

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
