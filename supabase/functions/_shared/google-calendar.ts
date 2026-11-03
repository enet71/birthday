import type { SupabaseContext } from 'npm:@supabase/server@1';
import { requireEnv } from './env.ts';
import { hasGoogleCalendarScopes } from './google-oauth.ts';

export type SupabaseAdmin = SupabaseContext['supabaseAdmin'];

export interface BirthdayRecord {
  id: string;
  user_id: string;
  name: string;
  // `yyyy-MM-dd`; the year 0004 marks an unknown birth year, as in the web app.
  birth_date: string;
  // The Google contact the birthday came from; Google shows it already, so Birthdly does not export it.
  google_contact_id: string | null;
  google_contact_snapshot: string | null;
  // The id of the birthday's current event in the user's primary Google calendar.
  google_event_id: string | null;
  updated_at: string;
}

export const BIRTHDAY_COLUMNS = 'id, user_id, name, birth_date, google_contact_id, google_contact_snapshot, google_event_id, updated_at';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
export const UNKNOWN_BIRTH_YEAR = '0004';
// A leap year, so a year-less Feb 29 still starts on Feb 29.
const YEARLESS_START_YEAR = '2000';
// All-day reminders count from the start of the day, so this is 9:00 the day before.
const REMINDER_MINUTES = 15 * 60;
const PAGE_SIZE = 500;
// Birthdly's events: `b`, the 32 hex digits of the birthday id, then 8 random base32hex characters, because Google never
// lets a deleted event id be used again.
const EVENT_ID_PATTERN = /^b[0-9a-f]{32}[0-9a-v]{8}$/;
const BIRTHDAY_EVENTS_PATH = '/calendars/primary/events';
const PARALLEL_REQUESTS = 5;
const LOOKUP_CHUNK_SIZE = 100;
const RETRY_DELAYS_MS = [1000, 3000];

// Google no longer accepts the saved access; the connection is marked `revoked`.
export class GoogleAccessRevokedError extends Error {}

export async function getGoogleAccessToken(supabaseAdmin: SupabaseAdmin, userId: string): Promise<string> {
  const { data: refreshToken, error } = await supabaseAdmin.rpc('get_google_calendar_refresh_token', { target_user_id: userId });

  if (error) {
    throw error;
  }
  if (!refreshToken) {
    await markAccessRevoked(supabaseAdmin, userId);
    throw new GoogleAccessRevokedError('No Google refresh token is saved');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (response.ok) {
    const tokens = await response.json();

    // A connection made before Birthdly needed today's scopes has to be connected again.
    if (tokens.scope && !hasGoogleCalendarScopes(tokens.scope)) {
      await markAccessRevoked(supabaseAdmin, userId);
      throw new GoogleAccessRevokedError('The Google access lacks a required scope');
    }
    return tokens.access_token;
  }

  const body = await response.text();

  if (response.status === 400 && body.includes('invalid_grant')) {
    await markAccessRevoked(supabaseAdmin, userId);
    throw new GoogleAccessRevokedError('Google revoked the access');
  }

  throw new Error(`Google token refresh failed: ${response.status} ${body}`);
}

// Only a still-connected user is marked: a disconnect may have revoked the token on purpose.
async function markAccessRevoked(supabaseAdmin: SupabaseAdmin, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('google_calendar_connections')
    .update({ status: 'revoked' })
    .eq('user_id', userId)
    .eq('status', 'connected');

  if (error) {
    throw error;
  }
}

function isBirthdlyEventId(eventId: string): boolean {
  return EVENT_ID_PATTERN.test(eventId);
}

// Brings one birthday's event in line with the database. The change only says which birthday changed: changes can
// arrive out of order, so the current row decides between updating and deleting the event. A birthday linked to a
// Google contact has no event of Birthdly's, because Google shows the contact's birthday already. `deletedEventId` is
// the event of a birthday that no longer exists, which only the change itself still knows.
export async function syncBirthdayEvent(
  supabaseAdmin: SupabaseAdmin,
  accessToken: string,
  birthdayId: string,
  deletedEventId: string | null = null,
): Promise<void> {
  const { data: birthday, error } = await supabaseAdmin.from('birthdays').select(BIRTHDAY_COLUMNS).eq('id', birthdayId).maybeSingle();

  if (error) {
    throw error;
  }
  if (!birthday) {
    if (deletedEventId) {
      await deleteEvent(accessToken, deletedEventId);
    }
    return;
  }
  if (!birthday.google_contact_id) {
    await upsertBirthdayEvent(supabaseAdmin, accessToken, birthday);
    return;
  }
  if (birthday.google_event_id) {
    await deleteEvent(accessToken, birthday.google_event_id);
    await saveEventId(supabaseAdmin, birthday, null);
  }
}

// Makes the birthdays Birthdly created in Google match Birthdly: creates or updates every event and deletes Birthdly
// events that no birthday points to. Pass the token when the caller has it.
export async function reconcileBirthdayEvents(supabaseAdmin: SupabaseAdmin, userId: string, accessToken?: string): Promise<void> {
  const token = accessToken ?? (await getGoogleAccessToken(supabaseAdmin, userId));
  // Events are listed before birthdays are read, so an event created meanwhile is not taken for an orphan. One that
  // still is gets created again with a new id on the next sync.
  const ownEventIds = (await listBirthdayEvents(token))
    .filter((event) => !event.recurringEventId && isBirthdlyEventId(event.id))
    .map((event) => event.id as string);
  const birthdays = await readAllBirthdayEventIds(supabaseAdmin, userId);
  const usedEventIds = new Set(birthdays.map((birthday) => birthday.google_event_id).filter(Boolean));
  const orphanEventIds = ownEventIds.filter((eventId) => !usedEventIds.has(eventId));

  // Each birthday is read again right before its event is written, so a change made during the reconcile wins.
  await runInParallel(birthdays, (birthday) => syncBirthdayEvent(supabaseAdmin, token, birthday.id));
  await runInParallel(await findTrueOrphans(supabaseAdmin, userId, orphanEventIds), (eventId) => deleteEvent(token, eventId));

  const { error } = await supabaseAdmin
    .from('google_calendar_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

// Forgets the user's event ids, then removes the events Birthdly created in the user's Google Calendar; the birthdays
// stay. Forgetting comes first, so even after a failed removal no birthday points to a deleted event, and what
// remains in Google is an orphan the next connection's reconcile removes.
export async function forgetAndDeleteBirthdayEvents(supabaseAdmin: SupabaseAdmin, userId: string, accessToken: string): Promise<void> {
  const { error } = await supabaseAdmin.from('birthdays').update({ google_event_id: null }).eq('user_id', userId).not('google_event_id', 'is', null);

  if (error) {
    throw error;
  }

  const ownEventIds = (await listBirthdayEvents(accessToken))
    .filter((event) => !event.recurringEventId && isBirthdlyEventId(event.id))
    .map((event) => event.id as string);

  await runInParallel(await findTrueOrphans(supabaseAdmin, userId, ownEventIds), (eventId) => deleteEvent(accessToken, eventId));
}

// Of Birthdly's events, keeps those no birthday points to right now and whose birthday is not another Birthdly
// account's: two accounts may share one Google account.
async function findTrueOrphans(supabaseAdmin: SupabaseAdmin, userId: string, eventIds: string[]): Promise<string[]> {
  if (eventIds.length === 0) {
    return [];
  }

  const usedIds = new Set<string>();
  const otherAccounts = new Set<string>();

  // In chunks, because the ids go into the request URL.
  for (let start = 0; start < eventIds.length; start += LOOKUP_CHUNK_SIZE) {
    const chunk = eventIds.slice(start, start + LOOKUP_CHUNK_SIZE);
    const { data: used, error: usedError } = await supabaseAdmin.from('birthdays').select('google_event_id').in('google_event_id', chunk);
    const { data: owners, error: ownersError } = await supabaseAdmin.from('birthdays').select('id, user_id').in('id', chunk.map(toBirthdayIdOfEvent));

    if (usedError || ownersError) {
      throw usedError ?? ownersError;
    }
    used.forEach((row: { google_event_id: string }) => usedIds.add(row.google_event_id));
    owners.filter((row: { user_id: string }) => row.user_id !== userId).forEach((row: { id: string }) => otherAccounts.add(row.id));
  }

  return eventIds.filter((eventId) => !usedIds.has(eventId) && !otherAccounts.has(toBirthdayIdOfEvent(eventId)));
}

// The birthday id inside a Birthdly event id.
function toBirthdayIdOfEvent(eventId: string): string {
  const hex = eventId.slice(1, 33);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Birthday events of the primary calendar: Birthdly's and those of Google contacts. With `updatedMin`, only events
// updated since then, including deleted ones: Google lists deleted events only this way, and they carry only their id
// for sure. `null` when `updatedMin` is further back than Google keeps deleted events.
// deno-lint-ignore no-explicit-any
export async function listBirthdayEvents(accessToken: string): Promise<any[]>;
// deno-lint-ignore no-explicit-any
export async function listBirthdayEvents(accessToken: string, updatedMin: Date): Promise<any[] | null>;
// deno-lint-ignore no-explicit-any
export async function listBirthdayEvents(accessToken: string, updatedMin?: Date): Promise<any[] | null> {
  // deno-lint-ignore no-explicit-any
  const events: any[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      eventTypes: 'birthday',
      maxResults: '2500',
      ...(updatedMin ? { updatedMin: updatedMin.toISOString(), showDeleted: 'true' } : {}),
      ...(pageToken ? { pageToken } : {}),
    });
    // Google answers 410 Gone for an `updatedMin` too long ago.
    const page = await callCalendarApi(accessToken, 'GET', `${BIRTHDAY_EVENTS_PATH}?${params}`, undefined, updatedMin ? [410] : []);

    if (page === null) {
      return null;
    }
    events.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return events;
}

async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  // 404 and 410 mean the event is already gone, for example deleted in Google.
  await callCalendarApi(accessToken, 'DELETE', `${BIRTHDAY_EVENTS_PATH}/${eventId}`, undefined, [404, 410]);
}

// Updates the birthday's event, or creates one with a new id when it has none or Google deleted it.
async function upsertBirthdayEvent(supabaseAdmin: SupabaseAdmin, accessToken: string, birthday: BirthdayRecord): Promise<void> {
  if (birthday.google_event_id) {
    const event = toGoogleEvent(birthday, birthday.google_event_id);
    const updated = await callCalendarApi(accessToken, 'PUT', `${BIRTHDAY_EVENTS_PATH}/${event.id}`, event, [404, 410]);

    // Updating a deleted event may succeed and leave it deleted, so only a live event counts.
    if (updated !== null && updated.status !== 'cancelled') {
      return;
    }
  }

  // A disconnect may be running: it forgets all event ids first, so nothing may be created after that.
  if (!(await isConnected(supabaseAdmin, birthday.user_id))) {
    return;
  }

  const event = toGoogleEvent(birthday, createEventId(birthday.id));
  const created = await callCalendarApi(accessToken, 'POST', BIRTHDAY_EVENTS_PATH, event);

  if (created.id !== event.id) {
    await deleteEvent(accessToken, created.id);
    throw new Error(`Google did not keep the event id ${event.id as string}`);
  }
  // Of two parallel syncs only the first saves its event; the other one removes its copy.
  if (!(await saveEventId(supabaseAdmin, birthday, event.id as string))) {
    await deleteEvent(accessToken, event.id as string);
    return;
  }
  // An event created while the user disconnected is removed too, after forgetting it, so that removal never counts as
  // a deletion by the user.
  if (!(await isConnected(supabaseAdmin, birthday.user_id))) {
    await saveEventId(supabaseAdmin, { ...birthday, google_event_id: event.id as string }, null);
    await deleteEvent(accessToken, event.id as string);
  }
}

export async function isConnected(supabaseAdmin: SupabaseAdmin, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('google_calendar_connections').select('status').eq('user_id', userId).maybeSingle();

  if (error) {
    throw error;
  }
  return data?.status === 'connected';
}

// Saves the event id only over the value read before. Saving bumps `updated_at`, so the new event does not look like a
// later change in Google to the import.
export async function saveEventId(supabaseAdmin: SupabaseAdmin, birthday: BirthdayRecord, eventId: string | null): Promise<boolean> {
  // A birthday linked to a Google source meanwhile must not get an event.
  const base = supabaseAdmin.from('birthdays').update({ google_event_id: eventId }).eq('id', birthday.id);
  const update = eventId ? base.is('google_contact_id', null) : base;
  const { data, error } = await (
    birthday.google_event_id ? update.eq('google_event_id', birthday.google_event_id) : update.is('google_event_id', null)
  ).select('id');

  if (error) {
    throw error;
  }
  return data.length > 0;
}

function createEventId(birthdayId: string): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuv';
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => alphabet[byte % alphabet.length]).join('');

  // Google event ids allow only the base32hex characters a–v and 0–9, which covers a hex UUID.
  return `b${birthdayId.replaceAll('-', '')}${suffix}`;
}

async function readAllBirthdayEventIds(supabaseAdmin: SupabaseAdmin, userId: string): Promise<{ id: string; google_event_id: string | null }[]> {
  const birthdays: { id: string; google_event_id: string | null }[] = [];

  // Keyset pages: a row deleted meanwhile cannot shift the next page and skip a birthday.
  while (true) {
    const query = supabaseAdmin.from('birthdays').select('id, google_event_id').eq('user_id', userId).order('id').limit(PAGE_SIZE);
    const { data, error } = await (birthdays.length > 0 ? query.gt('id', birthdays[birthdays.length - 1].id) : query);

    if (error) {
      throw error;
    }
    birthdays.push(...data);
    if (data.length < PAGE_SIZE) {
      return birthdays;
    }
  }
}

async function runInParallel<T>(items: T[], task: (item: T) => Promise<void>): Promise<void> {
  const errors: unknown[] = [];

  for (let start = 0; start < items.length; start += PARALLEL_REQUESTS) {
    const results = await Promise.allSettled(items.slice(start, start + PARALLEL_REQUESTS).map(task));

    errors.push(...results.filter((result) => result.status === 'rejected').map((result) => (result as PromiseRejectedResult).reason));
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, `${errors.length} of ${items.length} Google Calendar updates failed`);
  }
}

// A Google birthday event: Google allows only these fields on it.
function toGoogleEvent(birthday: BirthdayRecord, eventId: string): Record<string, unknown> {
  const [year, month, day] = birthday.birth_date.split('-');
  const startDate = `${year !== UNKNOWN_BIRTH_YEAR ? year : YEARLESS_START_YEAR}-${month}-${day}`;
  const endDate = new Date(Date.parse(`${startDate}T00:00:00Z`) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  // In other years a Feb 29 birthday falls on the last day of February, as in the web app.
  const recurrence = month === '02' && day === '29' ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY';

  return {
    id: eventId,
    eventType: 'birthday',
    birthdayProperties: { type: 'birthday' },
    summary: birthday.name,
    start: { date: startDate },
    end: { date: endDate },
    recurrence: [recurrence],
    visibility: 'private',
    transparency: 'transparent',
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: REMINDER_MINUTES }] },
  };
}

async function callCalendarApi(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown,
  allowedStatuses: number[] = [],
  canRetry = true,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  return await callGoogleApi(accessToken, method, `${CALENDAR_API}${path}`, body, allowedStatuses, canRetry);
}

// Returns the JSON body, an empty object for an empty response, or `null` for one of `allowedStatuses`. Retries rate
// limits and server errors a few times.
export async function callGoogleApi(
  accessToken: string,
  method: string,
  url: string,
  body?: unknown,
  allowedStatuses: number[] = [],
  canRetry = true,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (allowedStatuses.includes(response.status)) {
      await response.body?.cancel();
      return null;
    }
    if (response.ok) {
      const text = await response.text();

      return text ? JSON.parse(text) : {};
    }

    const text = await response.text();
    const isRetryable = response.status === 429 || response.status >= 500 || (response.status === 403 && /rateLimitExceeded/i.test(text));

    if (!canRetry || !isRetryable || attempt >= RETRY_DELAYS_MS.length) {
      throw new Error(`Google API ${method} ${url} failed: ${response.status} ${text}`);
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }
}
