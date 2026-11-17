import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { birthdays, DATABASE, Database } from '@birthday/api-database';
import { UNKNOWN_BIRTH_YEAR } from '../constants';
import { BirthdayRecord, GoogleEvent } from '../types';
import { findBirthdayRecord, readBirthdayRecords } from './birthday-records';
import { GoogleApiClient } from './google-api.client';
import { GoogleConnectionsService } from './google-connections.service';

const BIRTHDAY_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
// A leap year, so a year-less Feb 29 still starts on Feb 29.
const YEARLESS_START_YEAR = '2000';
// All-day reminders count from the start of the day, so this is 9:00 the day before.
const REMINDER_MINUTES = 15 * 60;
// Birthdly's events: `b`, the 32 hex digits of the birthday id, then 8 random base32hex characters, because Google never
// lets a deleted event id be used again.
const EVENT_ID_PATTERN = /^b[0-9a-f]{32}[0-9a-v]{8}$/;
const EVENT_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuv';
const PARALLEL_REQUESTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

// Birthdly's birthdays as birthday events in the user's primary Google calendar.
@Injectable()
export class GoogleCalendarEventsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly api: GoogleApiClient,
    private readonly connections: GoogleConnectionsService,
  ) {}

  // Brings one birthday's event in line with the database. A change only says which birthday changed: changes can
  // arrive out of order, so the current row decides between updating and deleting the event. A birthday linked to a
  // Google contact has no event of Birthdly's, because Google shows the contact's birthday already.
  // `deletedEventId` is the event of a birthday that no longer exists, which only the change itself still knows.
  public async syncBirthdayEvent(userId: string, accessToken: string, birthdayId: string, deletedEventId: string | null = null): Promise<void> {
    const birthday = await findBirthdayRecord(this.db, userId, birthdayId);

    if (!birthday) {
      if (deletedEventId) {
        await this.deleteEvent(accessToken, deletedEventId);
      }
      return;
    }
    if (!birthday.googleContactId) {
      await this.upsertBirthdayEvent(accessToken, birthday);
      return;
    }
    if (birthday.googleEventId) {
      await this.deleteEvent(accessToken, birthday.googleEventId);
      await this.saveEventId(birthday, null);
    }
  }

  // Makes the birthdays Birthdly created in Google match Birthdly: creates or updates every event and deletes Birthdly
  // events that no birthday points to.
  public async reconcile(userId: string, accessToken: string): Promise<void> {
    // Events are listed before birthdays are read, so an event created meanwhile is not taken for an orphan. One that
    // still is gets created again with a new id on the next sync.
    const ownEventIds = this.pickOwnEventIds(await this.listBirthdayEvents(accessToken));
    const records = await readBirthdayRecords(this.db, userId);
    const usedEventIds = new Set(records.map((record) => record.googleEventId));
    const orphanEventIds = ownEventIds.filter((eventId) => !usedEventIds.has(eventId));

    // Each birthday is read again right before its event is written, so a change made during the reconcile wins.
    await this.runInParallel(records, (record) => this.syncBirthdayEvent(userId, accessToken, record.id));
    await this.runInParallel(await this.findTrueOrphans(userId, orphanEventIds), (eventId) => this.deleteEvent(accessToken, eventId));
    await this.connections.markSynced(userId);
  }

  // Forgets the user's event ids, then removes the events Birthdly created in the user's Google Calendar; the birthdays
  // stay. Forgetting comes first, so even after a failed removal no birthday points to a deleted event, and what
  // remains in Google is an orphan the next connection's reconcile removes.
  public async forgetAndDeleteBirthdayEvents(userId: string, accessToken: string): Promise<void> {
    await this.db
      .update(birthdays)
      .set({ googleEventId: null })
      .where(and(eq(birthdays.userId, userId), isNotNull(birthdays.googleEventId)));

    const ownEventIds = this.pickOwnEventIds(await this.listBirthdayEvents(accessToken));

    await this.runInParallel(await this.findTrueOrphans(userId, ownEventIds), (eventId) => this.deleteEvent(accessToken, eventId));
  }

  // Birthday events of the primary calendar: Birthdly's and those of Google contacts. With `updatedMin`, only events
  // updated since then, including deleted ones: Google lists deleted events only this way. `null` when `updatedMin` is
  // further back than Google keeps deleted events.
  public async listBirthdayEvents(accessToken: string): Promise<GoogleEvent[]>;
  public async listBirthdayEvents(accessToken: string, updatedMin: Date): Promise<GoogleEvent[] | null>;
  public async listBirthdayEvents(accessToken: string, updatedMin?: Date): Promise<GoogleEvent[] | null> {
    const events: GoogleEvent[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        eventTypes: 'birthday',
        maxResults: '2500',
        ...(updatedMin ? { updatedMin: updatedMin.toISOString(), showDeleted: 'true' } : {}),
        ...(pageToken ? { pageToken } : {}),
      });
      // Google answers 410 Gone for an `updatedMin` too long ago.
      const page = await this.api.request(accessToken, 'GET', `${BIRTHDAY_EVENTS_URL}?${params}`, undefined, updatedMin ? [410] : []);

      if (page === null) {
        return null;
      }
      events.push(...(page.items ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);

    return events;
  }

  // Saves the event id only over the value read before. Saving bumps `updated_at`, so the new event does not look like a
  // later change in Google to the import. A birthday linked to a Google contact meanwhile must not get an event.
  public async saveEventId(birthday: Pick<BirthdayRecord, 'id' | 'googleEventId'>, eventId: string | null): Promise<boolean> {
    const saved = await this.db
      .update(birthdays)
      .set({ googleEventId: eventId })
      .where(
        and(
          eq(birthdays.id, birthday.id),
          birthday.googleEventId ? eq(birthdays.googleEventId, birthday.googleEventId) : isNull(birthdays.googleEventId),
          eventId ? isNull(birthdays.googleContactId) : undefined,
        ),
      )
      .returning({ id: birthdays.id });

    return saved.length > 0;
  }

  private pickOwnEventIds(events: GoogleEvent[]): string[] {
    return events.filter((event) => !event.recurringEventId && EVENT_ID_PATTERN.test(event.id)).map((event) => event.id);
  }

  private async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    // 404 and 410 mean the event is already gone, for example deleted in Google.
    await this.api.request(accessToken, 'DELETE', `${BIRTHDAY_EVENTS_URL}/${eventId}`, undefined, [404, 410]);
  }

  // Updates the birthday's event, or creates one with a new id when it has none or Google deleted it.
  private async upsertBirthdayEvent(accessToken: string, birthday: BirthdayRecord): Promise<void> {
    if (birthday.googleEventId) {
      const event = this.toGoogleEvent(birthday, birthday.googleEventId);
      const updated = await this.api.request(accessToken, 'PUT', `${BIRTHDAY_EVENTS_URL}/${birthday.googleEventId}`, event, [404, 410]);

      // Updating a deleted event may succeed and leave it deleted, so only a live event counts.
      if (updated !== null && updated.status !== 'cancelled') {
        return;
      }
    }

    // A disconnect may be running: it forgets all event ids first, so nothing may be created after that.
    if (!(await this.connections.isConnected(birthday.userId))) {
      return;
    }

    const eventId = this.createEventId(birthday.id);
    const created = await this.api.request(accessToken, 'POST', BIRTHDAY_EVENTS_URL, this.toGoogleEvent(birthday, eventId));

    if (created.id !== eventId) {
      await this.deleteEvent(accessToken, created.id);
      throw new Error(`Google did not keep the event id ${eventId}`);
    }
    // Of two parallel syncs only the first saves its event; the other one removes its copy.
    if (!(await this.saveEventId(birthday, eventId))) {
      await this.deleteEvent(accessToken, eventId);
      return;
    }
    // An event created while the user disconnected is removed too, after forgetting it, so that removal never counts as
    // a deletion by the user.
    if (!(await this.connections.isConnected(birthday.userId))) {
      await this.saveEventId({ id: birthday.id, googleEventId: eventId }, null);
      await this.deleteEvent(accessToken, eventId);
    }
  }

  // Of Birthdly's events, keeps those no birthday points to right now and whose birthday is not another Birthdly
  // account's: two accounts may share one Google account.
  private async findTrueOrphans(userId: string, eventIds: string[]): Promise<string[]> {
    if (eventIds.length === 0) {
      return [];
    }

    const used = await this.db.select({ googleEventId: birthdays.googleEventId }).from(birthdays).where(inArray(birthdays.googleEventId, eventIds));
    const owners = await this.db
      .select({ id: birthdays.id, userId: birthdays.userId })
      .from(birthdays)
      .where(inArray(birthdays.id, eventIds.map(toBirthdayIdOfEvent)));
    const usedIds = new Set(used.map((row) => row.googleEventId));
    const otherAccounts = new Set(owners.filter((row) => row.userId !== userId).map((row) => row.id));

    return eventIds.filter((eventId) => !usedIds.has(eventId) && !otherAccounts.has(toBirthdayIdOfEvent(eventId)));
  }

  // Google event ids allow only the base32hex characters a-v and 0-9, which covers a hex UUID.
  private createEventId(birthdayId: string): string {
    const suffix = Array.from(randomBytes(8), (byte) => EVENT_ID_ALPHABET[byte % EVENT_ID_ALPHABET.length]).join('');

    return `b${birthdayId.replaceAll('-', '')}${suffix}`;
  }

  // Runs the tasks a few at a time; one failing does not stop the others, but the whole run fails at the end.
  private async runInParallel<T>(items: T[], task: (item: T) => Promise<void>): Promise<void> {
    const errors: unknown[] = [];

    for (let start = 0; start < items.length; start += PARALLEL_REQUESTS) {
      const results = await Promise.allSettled(items.slice(start, start + PARALLEL_REQUESTS).map(task));

      errors.push(...results.filter((result) => result.status === 'rejected').map((result) => result.reason));
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} of ${items.length} Google Calendar updates failed`);
    }
  }

  // A Google birthday event: Google allows only these fields on it.
  private toGoogleEvent(birthday: BirthdayRecord, eventId: string): Record<string, unknown> {
    const [year, month, day] = birthday.birthDate.split('-');
    const startDate = `${year !== UNKNOWN_BIRTH_YEAR ? year : YEARLESS_START_YEAR}-${month}-${day}`;
    const endDate = new Date(Date.parse(`${startDate}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
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
}

// The birthday id inside a Birthdly event id.
function toBirthdayIdOfEvent(eventId: string): string {
  const hex = eventId.slice(1, 33);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
