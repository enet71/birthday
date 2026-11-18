import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, lt, lte } from 'drizzle-orm';
import { birthdays, DATABASE, Database, googleCalendarConnections } from '@birthday/api-database';
import { UNKNOWN_BIRTH_YEAR } from '../constants';
import { BirthdayRecord, ContactBirthday, GoogleEvent, ImportSummary } from '../types';
import { isUnchangedSince, readBirthdayRecords } from './birthday-records';
import { GoogleApiClient } from './google-api.client';
import { GoogleCalendarEventsService } from './google-calendar-events.service';
import { GoogleCalendarPushQueue } from './google-calendar-push.queue';
import { GoogleConnectionsService } from './google-connections.service';

interface GoogleDate {
  year?: number;
  month?: number;
  day?: number;
}

interface FieldMetadata {
  primary?: boolean;
  source?: { type?: string; id?: string };
}

// The fields of a People API person the import reads.
interface GooglePerson {
  resourceName: string;
  names?: { displayName?: string; metadata?: FieldMetadata }[];
  birthdays?: { date?: GoogleDate; metadata?: FieldMetadata }[];
  metadata?: { sources?: { type?: string; id?: string; updateTime?: string }[]; deleted?: boolean };
}

// One contacts read. A full read lists every contact with a birthday; an incremental one lists only the contacts
// changed since the last read, and `removedContactIds` those deleted or without a birthday now.
interface ContactsRead {
  isFull: boolean;
  contacts: ContactBirthday[];
  removedContactIds: string[];
  nextSyncToken: string | null;
}

type BirthdayChanges = Partial<Pick<BirthdayRecord, 'name' | 'birthDate' | 'googleContactId' | 'googleContactSnapshot'>>;

const connections = googleCalendarConnections;
const PEOPLE_CONNECTIONS_URL = 'https://people.googleapis.com/v1/people/me/connections';
const PERSON_FIELDS = 'names,birthdays,metadata';
// The database limit for a birthday name.
const MAX_NAME_LENGTH = 200;
// A crashed sync releases the user after this long.
const SYNC_LEASE_MS = 10 * 60 * 1000;
const UNIQUE_VIOLATION = '23505';
// Deleted events show up only among events updated since a given time; this margin covers clock differences.
const DELETION_LOOKBACK_MS = 24 * 60 * 60 * 1000;

// Imports birthdays from Google: the birthdays of the user's contacts, and deletions of Birthdly's birthday events.
@Injectable()
export class GoogleImportService {
  private readonly logger = new Logger(GoogleImportService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly api: GoogleApiClient,
    private readonly connections: GoogleConnectionsService,
    private readonly events: GoogleCalendarEventsService,
    private readonly pushQueue: GoogleCalendarPushQueue,
  ) {}

  // Imports from Google. `full` reads every contact instead of the changes since the last read, and then makes
  // Birthdly's birthdays in Google match Birthdly, which repairs whatever went wrong before. Skips, and returns `null`,
  // while another sync of the user runs or when the last one started less than `minIntervalMs` ago.
  public async runSync(userId: string, options: { minIntervalMs: number; full: boolean }): Promise<ImportSummary | null> {
    const now = Date.now();
    const claimed = await this.db
      .update(connections)
      .set({ lastPulledAt: new Date(now).toISOString(), syncRunningUntil: new Date(now + SYNC_LEASE_MS).toISOString() })
      .where(
        and(
          eq(connections.userId, userId),
          eq(connections.status, 'connected'),
          lt(connections.syncRunningUntil, new Date(now).toISOString()),
          lte(connections.lastPulledAt, new Date(now - options.minIntervalMs).toISOString()),
        ),
      )
      .returning({ userId: connections.userId });

    if (claimed.length === 0) {
      return null;
    }

    try {
      return await this.syncWithGoogle(userId, options.full, now);
    } finally {
      await this.db
        .update(connections)
        .set({ syncRunningUntil: '-infinity' })
        .where(eq(connections.userId, userId))
        .catch((error: unknown) => this.logger.error({ err: error }, 'Releasing the Google sync lease failed; the next sync waits for it to expire'));
    }
  }

  // `startedAt` is when this sync claimed the user. Sets `last_synced_at` on success.
  private async syncWithGoogle(userId: string, full: boolean, startedAt: number): Promise<ImportSummary> {
    // Before the access token: a reconnect in between must not store this account's sync token on the new connection.
    const savedSyncToken = await this.connections.readContactsSyncToken(userId);
    const accessToken = await this.connections.getAccessToken(userId);
    const summary: ImportSummary = { added: 0, updated: 0, deleted: 0 };

    if (savedSyncToken) {
      await this.importContacts(userId, accessToken, full ? { ...savedSyncToken, syncToken: null } : savedSyncToken, summary);
    }
    await this.importDeletedBirthdayEvents(userId, accessToken, startedAt, summary);

    if (full) {
      await this.events.reconcile(userId, accessToken);
    } else {
      await this.connections.markSynced(userId);
    }
    return summary;
  }

  // The sync token moves on only after the read was imported, so a failed import reads the same changes again.
  // A `null` sync token reads every contact.
  private async importContacts(
    userId: string,
    accessToken: string,
    saved: { syncToken: string | null; connectedAt: Date },
    summary: ImportSummary,
  ): Promise<void> {
    const read = await this.readContacts(accessToken, saved.syncToken);

    await this.importContactBirthdays(userId, read, summary);
    await this.connections.saveContactsSyncToken(userId, saved.connectedAt, read.nextSyncToken);
  }

  // Brings in the birthdays of the user's Google contacts. A contact's birthday is applied only when it changed in
  // Google since the last import and that change is later than the last edit in Birthdly. Birthdly never changes
  // contacts.
  private async importContactBirthdays(userId: string, read: ContactsRead, summary: ImportSummary): Promise<void> {
    const records = await readBirthdayRecords(this.db, userId);
    const contacts = read.contacts;
    const contactIds = new Set(contacts.map((contact) => contact.contactId));
    const removedContactIds = new Set(read.removedContactIds);
    // A full read lists every contact, so a missing one is gone; an incremental read names the removed ones.
    const isRemoved = (contactId: string): boolean => (read.isFull ? !contactIds.has(contactId) : removedContactIds.has(contactId));

    // The birthday is gone from Google Contacts: Birthdly keeps it and starts exporting it to Google Calendar. This comes
    // first, so a contact recreated with a new id links to it instead of adding the person twice.
    for (const record of records) {
      if (record.googleContactId && isRemoved(record.googleContactId)) {
        await this.updateBirthday(record.id, { googleContactId: null, googleContactSnapshot: null });
        await this.pushQueue.birthdayChanged({ userId, birthdayId: record.id, deletedGoogleEventId: null });
        record.googleContactId = null;
        record.googleContactSnapshot = null;
      }
    }

    const byContactId = new Map(records.filter((record) => record.googleContactId).map((record) => [record.googleContactId, record]));

    for (const contact of contacts) {
      const linked = byContactId.get(contact.contactId);
      const snapshot = `${contact.birthDate}|${contact.name}`;

      if (linked) {
        await this.applyContactChange(linked, contact, snapshot, summary);
        continue;
      }

      // The same person added in both places is linked instead of being added twice. The link removes Birthdly's own
      // event, because Google shows the contact's birthday already.
      const match = records.find((record) => !record.googleContactId && isSamePerson(record, contact.name, contact.birthDate));

      if (match) {
        match.googleContactId = contact.contactId;
        if (await this.ignoreDuplicate(this.updateBirthday(match.id, { googleContactId: contact.contactId, googleContactSnapshot: snapshot }))) {
          await this.pushQueue.birthdayChanged({ userId, birthdayId: match.id, deletedGoogleEventId: null });
        }
        continue;
      }

      // An overlapping run may have imported the contact already; then nothing is inserted.
      const inserted = await this.db
        .insert(birthdays)
        .values({ userId, name: contact.name, birthDate: contact.birthDate, googleContactId: contact.contactId, googleContactSnapshot: snapshot })
        .onConflictDoNothing({ target: [birthdays.userId, birthdays.googleContactId] })
        .returning({ id: birthdays.id });

      summary.added += inserted.length;
    }
  }

  private async applyContactChange(linked: BirthdayRecord, contact: ContactBirthday, snapshot: string, summary: ImportSummary): Promise<void> {
    if (linked.googleContactSnapshot === snapshot) {
      return;
    }
    // Without a later change in Google, only the snapshot moves on, and the edit made in Birthdly stays.
    if (contact.updatedAt <= linked.updatedAtMs) {
      await this.updateBirthday(linked.id, { googleContactSnapshot: snapshot });
      return;
    }

    const birthDate = keepKnownYear(linked.birthDate, contact.birthDate);
    const isChanged = contact.name !== linked.name || birthDate !== linked.birthDate;
    const isApplied = await this.updateBirthday(linked.id, { name: contact.name, birthDate, googleContactSnapshot: snapshot }, linked.updatedAt);

    if (isApplied && isChanged) {
      summary.updated++;
    }
  }

  // With `syncToken`, reads only the contacts changed since that token was issued. Google rejects a token that expired
  // (7 days after the full read) or belongs to another account; then every contact is read again.
  private async readContacts(accessToken: string, syncToken: string | null): Promise<ContactsRead> {
    const read: ContactsRead = { isFull: !syncToken, contacts: [], removedContactIds: [], nextSyncToken: null };
    let pageToken: string | undefined;

    do {
      // Every page repeats the parameters of the first request, as Google requires.
      const params = new URLSearchParams({
        personFields: PERSON_FIELDS,
        pageSize: '1000',
        requestSyncToken: 'true',
        ...(syncToken ? { syncToken } : {}),
        ...(pageToken ? { pageToken } : {}),
      });
      const page = await this.api.request(accessToken, 'GET', `${PEOPLE_CONNECTIONS_URL}?${params}`, undefined, syncToken ? [400, 410] : []);

      if (page === null) {
        this.logger.warn('Google rejected the contacts sync token; all contacts are read again');
        return this.readContacts(accessToken, null);
      }
      for (const person of (page.connections ?? []) as GooglePerson[]) {
        const contact = person.metadata?.deleted ? null : toContactBirthday(person);

        if (contact) {
          read.contacts.push(contact);
        } else {
          read.removedContactIds.push(person.resourceName);
        }
      }
      pageToken = page.nextPageToken;
      read.nextSyncToken = page.nextSyncToken ?? null;
    } while (pageToken);

    return read;
  }

  // Brings in deletions the user made to Birthdly's birthdays in Google; Google allows no other change to birthday
  // events. Deleted events are listed only among events updated since a given time, so the read starts a little before
  // the time up to which deletions were read last. That time moves to `startedAt` only when all of them were handled. A
  // deleted event is handled once: afterwards no birthday points to its id any more. One failing event does not stop
  // the others; the import still fails at the end, so `last_synced_at` stays.
  private async importDeletedBirthdayEvents(userId: string, accessToken: string, startedAt: number, summary: ImportSummary): Promise<void> {
    const [connection] = await this.db
      .select({ deletionsCheckedAt: connections.deletionsCheckedAt })
      .from(connections)
      .where(eq(connections.userId, userId));
    // `-infinity` (right after connecting, when no birthday points to an event yet) parses to NaN.
    const checkedAt = Date.parse(connection?.deletionsCheckedAt ?? '');

    if (Number.isFinite(checkedAt)) {
      await this.importDeletions(userId, accessToken, checkedAt, summary);
    }
    await this.db
      .update(connections)
      .set({ deletionsCheckedAt: new Date(startedAt).toISOString() })
      .where(eq(connections.userId, userId));
  }

  private async importDeletions(userId: string, accessToken: string, checkedAt: number, summary: ImportSummary): Promise<void> {
    const events = await this.events.listBirthdayEvents(accessToken, new Date(checkedAt - DELETION_LOOKBACK_MS));

    // Google keeps deleted events only for a while; older ones can no longer be read, so they are given up.
    if (events === null) {
      this.logger.warn('Google no longer lists deletions this old; they are skipped');
      return;
    }

    const records = await readBirthdayRecords(this.db, userId);
    const byEventId = new Map(records.filter((record) => record.googleEventId).map((record) => [record.googleEventId, record]));
    const errors: unknown[] = [];

    for (const event of events) {
      const record = byEventId.get(event.id);

      // A linked birthday has no event of Birthdly's; one left over is removed by the push of the link.
      if (event.status !== 'cancelled' || event.recurringEventId || !record || record.googleContactId) {
        continue;
      }

      try {
        await this.importEventDeletion(accessToken, event, record, checkedAt, summary);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} Google birthday deletions could not be imported`);
    }
  }

  // The user deleted the birthday's event in Google. Without `updated`, the deletion is known only to be later than
  // `checkedAt`, up to which deletions were read before. If Birthdly changed the birthday later, the birthday stays and
  // gets a new event. Either way no birthday points to the deleted id afterwards, so the deletion is handled once.
  private async importEventDeletion(
    accessToken: string,
    event: GoogleEvent,
    record: BirthdayRecord,
    checkedAt: number,
    summary: ImportSummary,
  ): Promise<void> {
    // Birthdly deletes events itself only after forgetting their ids (disconnect) or replacing them, so a deletion
    // counts only while the user is connected and the birthday still points to the event.
    const [current] = await this.db.select({ googleEventId: birthdays.googleEventId }).from(birthdays).where(eq(birthdays.id, record.id));

    if (current?.googleEventId !== event.id || !(await this.connections.isConnected(record.userId))) {
      return;
    }

    const eventUpdatedAt = Date.parse(event.updated ?? '');
    const isGoogleLater = Number.isFinite(eventUpdatedAt) ? eventUpdatedAt > record.updatedAtMs : record.updatedAtMs <= checkedAt;

    if (isGoogleLater && (await this.deleteBirthday(record.id, record.updatedAt))) {
      summary.deleted++;
      return;
    }
    // Forgotten first, so a failed re-creation cannot turn into a deletion on the next sync.
    if (await this.events.saveEventId({ id: record.id, googleEventId: event.id }, null)) {
      await this.events.syncBirthdayEvent(record.userId, accessToken, record.id);
    }
  }

  // With `expectedUpdatedAt`, writes only if nobody changed the birthday since it was read, for example in the web app
  // during this sync. Returns whether a row was written.
  private async updateBirthday(id: string, changes: BirthdayChanges, expectedUpdatedAt?: string): Promise<boolean> {
    const updated = await this.db
      .update(birthdays)
      .set(changes)
      .where(and(eq(birthdays.id, id), expectedUpdatedAt ? isUnchangedSince(expectedUpdatedAt) : undefined))
      .returning({ id: birthdays.id });

    return updated.length > 0;
  }

  private async deleteBirthday(id: string, expectedUpdatedAt: string): Promise<boolean> {
    const deleted = await this.db
      .delete(birthdays)
      .where(and(eq(birthdays.id, id), isUnchangedSince(expectedUpdatedAt)))
      .returning({ id: birthdays.id });

    return deleted.length > 0;
  }

  // An overlapping run linked the contact to another birthday first; that link stays. Returns whether the write
  // succeeded.
  private async ignoreDuplicate(write: Promise<boolean>): Promise<boolean> {
    try {
      return await write;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      return false;
    }
  }
}

// Drizzle wraps the driver's error, so the Postgres code may sit on its `cause`.
function isUniqueViolation(error: unknown): boolean {
  const { code, cause } = error as { code?: string; cause?: { code?: string } };

  return code === UNIQUE_VIOLATION || cause?.code === UNIQUE_VIOLATION;
}

function toContactBirthday(person: GooglePerson): ContactBirthday | null {
  const pickPrimary = <T extends { metadata?: FieldMetadata }>(items: T[] | undefined): T | undefined =>
    items?.find((item) => item.metadata?.primary) ?? items?.[0];
  const name = pickPrimary(person.names)?.displayName?.trim().slice(0, MAX_NAME_LENGTH);
  const birthday = pickPrimary(person.birthdays?.filter((item) => item.date));
  const date = birthday?.date;

  if (!name || !date?.month || !date.day) {
    return null;
  }

  // Only the source of the birthday counts: a profile photo or a phone number changing must not undo a Birthdly edit.
  const birthdaySource = birthday?.metadata?.source;
  const source = (person.metadata?.sources ?? []).find((item) => item.type === birthdaySource?.type && item.id === birthdaySource?.id);
  const updatedAt = Date.parse(source?.updateTime ?? '');

  return {
    contactId: person.resourceName,
    name,
    birthDate: toValidBirthDate(date.year ? String(date.year).padStart(4, '0') : UNKNOWN_BIRTH_YEAR, pad(date.month), pad(date.day)),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
  };
}

function isSamePerson(record: BirthdayRecord, name: string, birthDate: string): boolean {
  const [recordYear, ...recordMonthDay] = record.birthDate.split('-');
  const [otherYear, ...otherMonthDay] = birthDate.split('-');
  const isYearCompatible = recordYear === otherYear || recordYear === UNKNOWN_BIRTH_YEAR || otherYear === UNKNOWN_BIRTH_YEAR;

  return normalizeName(record.name) === normalizeName(name) && recordMonthDay.join('-') === otherMonthDay.join('-') && isYearCompatible;
}

// A contact without a birth year does not erase a year known in Birthdly.
function keepKnownYear(current: string, imported: string): string {
  const [importedYear, month, day] = imported.split('-');

  return importedYear === UNKNOWN_BIRTH_YEAR && !current.startsWith(UNKNOWN_BIRTH_YEAR)
    ? toValidBirthDate(current.slice(0, 4), month, day)
    : imported;
}

// Feb 29 with a non-leap year, for example a known year combined with a year-less Feb 29 from Google, keeps the day
// and drops the year instead of failing the whole sync.
function toValidBirthDate(year: string, month: string, day: string): string {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  date.setUTCFullYear(Number(year));
  return date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
    ? `${year}-${month}-${day}`
    : `${UNKNOWN_BIRTH_YEAR}-${month}-${day}`;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
