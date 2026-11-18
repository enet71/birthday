import type { Mock } from 'vitest';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { birthdays, DATABASE, Database, DatabaseModule, googleCalendarConnections, users } from '@birthday/api-database';
import { GoogleApiClient } from './google-api.client';
import { GoogleCalendarEventsService } from './google-calendar-events.service';
import { GoogleCalendarPushQueue } from './google-calendar-push.queue';
import { GoogleConnectionsService } from './google-connections.service';
import { GoogleImportService } from './google-import.service';

const CONTAINER_TIMEOUT_MS = 120_000;
const MIGRATIONS_FOLDER = join(import.meta.dirname, '../../../../database/migrations');
const ACCESS_TOKEN = 'access-token';
const CONNECTED_AT = new Date('2026-11-01T10:00:00.000Z');
const INCREMENTAL = { minIntervalMs: 0, full: false };
const FULL = { minIntervalMs: 0, full: true };

interface PersonOptions {
  name?: string;
  date?: { year?: number; month?: number; day?: number };
  // When Google changed the birthday's source; defaults to a minute from now, later than any birthday in the test.
  updatedAt?: Date;
  deleted?: boolean;
}

interface ContactsPage {
  connections?: unknown[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

describe('GoogleImportService with a real Postgres', () => {
  let container: StartedPostgreSqlContainer;
  let moduleRef: TestingModule;
  let db: Database;
  let service: GoogleImportService;

  const api: { request: Mock<GoogleApiClient['request']> } = { request: vi.fn() };
  const connections: {
    readContactsSyncToken: Mock<GoogleConnectionsService['readContactsSyncToken']>;
    getAccessToken: Mock<GoogleConnectionsService['getAccessToken']>;
    saveContactsSyncToken: Mock<GoogleConnectionsService['saveContactsSyncToken']>;
    markSynced: Mock<GoogleConnectionsService['markSynced']>;
    isConnected: Mock<GoogleConnectionsService['isConnected']>;
  } = {
    readContactsSyncToken: vi.fn(),
    getAccessToken: vi.fn(),
    saveContactsSyncToken: vi.fn(),
    markSynced: vi.fn(),
    isConnected: vi.fn(),
  };
  const events: {
    reconcile: Mock<GoogleCalendarEventsService['reconcile']>;
    listBirthdayEvents: Mock;
    saveEventId: Mock<GoogleCalendarEventsService['saveEventId']>;
    syncBirthdayEvent: Mock<GoogleCalendarEventsService['syncBirthdayEvent']>;
  } = {
    reconcile: vi.fn(),
    listBirthdayEvents: vi.fn(),
    saveEventId: vi.fn(),
    syncBirthdayEvent: vi.fn(),
  };
  const pushQueue: { birthdayChanged: Mock<GoogleCalendarPushQueue['birthdayChanged']> } = { birthdayChanged: vi.fn() };

  beforeAll(async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ connectionString: container.getConnectionUri(), migrationsFolder: MIGRATIONS_FOLDER })],
      providers: [
        GoogleImportService,
        { provide: GoogleApiClient, useValue: api },
        { provide: GoogleConnectionsService, useValue: connections },
        { provide: GoogleCalendarEventsService, useValue: events },
        { provide: GoogleCalendarPushQueue, useValue: pushQueue },
      ],
    }).compile();
    await moduleRef.init();

    db = moduleRef.get<Database>(DATABASE);
    service = moduleRef.get(GoogleImportService);
  }, CONTAINER_TIMEOUT_MS);

  afterAll(async () => {
    await moduleRef?.close();
    await container?.stop();
    vi.restoreAllMocks();
  }, CONTAINER_TIMEOUT_MS);

  beforeEach(() => {
    vi.clearAllMocks();
    connections.getAccessToken.mockResolvedValue(ACCESS_TOKEN);
    connections.saveContactsSyncToken.mockResolvedValue(undefined);
    connections.markSynced.mockResolvedValue(undefined);
    events.reconcile.mockResolvedValue(undefined);
    pushQueue.birthdayChanged.mockResolvedValue(undefined);
  });

  // Every test works with its own user, so the tests do not depend on each other's rows.
  async function createConnectedUser(savedSyncToken: string | null): Promise<string> {
    const [user] = await db.insert(users).values({ googleSub: randomUUID(), email: 'person@example.com' }).returning({ id: users.id });

    await db.insert(googleCalendarConnections).values({ userId: user.id, status: 'connected' });
    connections.readContactsSyncToken.mockResolvedValue({ syncToken: savedSyncToken, connectedAt: CONNECTED_AT });
    return user.id;
  }

  async function createBirthday(userId: string, name: string, birthDate: string, googleContactId: string | null = null): Promise<string> {
    const [birthday] = await db
      .insert(birthdays)
      .values({ userId, name, birthDate, googleContactId, googleContactSnapshot: googleContactId ? `${birthDate}|${name}` : null })
      .returning({ id: birthdays.id });

    return birthday.id;
  }

  async function findBirthday(id: string): Promise<typeof birthdays.$inferSelect | undefined> {
    const [birthday] = await db.select().from(birthdays).where(eq(birthdays.id, id));

    return birthday;
  }

  function person(contactId: string, options: PersonOptions = {}): unknown {
    const source = { type: 'CONTACT', id: contactId };

    return {
      resourceName: `people/${contactId}`,
      names: options.name === undefined ? [] : [{ displayName: options.name, metadata: { primary: true, source } }],
      birthdays: options.date ? [{ date: options.date, metadata: { primary: true, source } }] : [],
      metadata: {
        sources: [{ ...source, updateTime: (options.updatedAt ?? new Date(Date.now() + 60_000)).toISOString() }],
        ...(options.deleted ? { deleted: true } : {}),
      },
    };
  }

  function respondWithPages(...pages: (ContactsPage | null)[]): void {
    for (const page of pages) {
      api.request.mockResolvedValueOnce(page);
    }
  }

  function requestedParams(callIndex: number): URLSearchParams {
    return new URL(api.request.mock.calls[callIndex][2]).searchParams;
  }

  describe('full contacts read', () => {
    it('reads every contact without the saved sync token on "Sync now" and unlinks a birthday whose contact is gone', async () => {
      const userId = await createConnectedUser('saved-token');
      const goneId = await createBirthday(userId, 'Gone Person', '1990-05-01', 'people/gone');
      const keptId = await createBirthday(userId, 'Kept Person', '1985-03-02', 'people/kept');
      respondWithPages({
        connections: [person('kept', { name: 'Kept Person', date: { year: 1985, month: 3, day: 2 } })],
        nextSyncToken: 'new-token',
      });

      await service.runSync(userId, FULL);

      const params = requestedParams(0);
      expect(api.request).toHaveBeenCalledTimes(1);
      expect(api.request.mock.calls[0][4]).toEqual([]);
      expect(params.has('syncToken')).toBe(false);
      expect(params.get('requestSyncToken')).toBe('true');
      expect(await findBirthday(goneId)).toMatchObject({ name: 'Gone Person', googleContactId: null, googleContactSnapshot: null });
      expect(await findBirthday(keptId)).toMatchObject({ googleContactId: 'people/kept' });
      expect(pushQueue.birthdayChanged).toHaveBeenCalledTimes(1);
      expect(pushQueue.birthdayChanged).toHaveBeenCalledWith({ userId, birthdayId: goneId, deletedGoogleEventId: null });
      expect(events.reconcile).toHaveBeenCalledWith(userId, ACCESS_TOKEN);
      expect(connections.markSynced).not.toHaveBeenCalled();
    });

    it('reads every contact on a background sync when no sync token is saved yet', async () => {
      const userId = await createConnectedUser(null);
      const goneId = await createBirthday(userId, 'Gone Person', '1990-05-01', 'people/gone');
      respondWithPages({ connections: [], nextSyncToken: 'first-token' });

      await service.runSync(userId, INCREMENTAL);

      expect(requestedParams(0).has('syncToken')).toBe(false);
      expect(requestedParams(0).get('requestSyncToken')).toBe('true');
      expect(await findBirthday(goneId)).toMatchObject({ googleContactId: null, googleContactSnapshot: null });
      expect(connections.saveContactsSyncToken).toHaveBeenCalledWith(userId, CONNECTED_AT, 'first-token');
      expect(connections.markSynced).toHaveBeenCalledWith(userId);
      expect(events.reconcile).not.toHaveBeenCalled();
    });

    it('reads every contact again without a sync token when Google rejects the saved one', async () => {
      const userId = await createConnectedUser('expired-token');
      const goneId = await createBirthday(userId, 'Gone Person', '1990-05-01', 'people/gone');
      respondWithPages(null, { connections: [], nextSyncToken: 'fresh-token' });

      const summary = await service.runSync(userId, INCREMENTAL);

      expect(summary).toEqual({ added: 0, updated: 0, deleted: 0 });
      expect(api.request).toHaveBeenCalledTimes(2);
      expect(requestedParams(0).get('syncToken')).toBe('expired-token');
      expect(api.request.mock.calls[0][4]).toEqual([400, 410]);
      expect(requestedParams(1).has('syncToken')).toBe(false);
      expect(requestedParams(1).get('requestSyncToken')).toBe('true');
      expect(api.request.mock.calls[1][4]).toEqual([]);
      expect(await findBirthday(goneId)).toMatchObject({ googleContactId: null });
      expect(connections.saveContactsSyncToken).toHaveBeenCalledWith(userId, CONNECTED_AT, 'fresh-token');
    });
  });

  describe('incremental contacts read', () => {
    it('sends the saved sync token and unlinks only the deleted contact and the one without a birthday', async () => {
      const userId = await createConnectedUser('saved-token');
      const deletedId = await createBirthday(userId, 'Deleted Person', '1990-05-01', 'people/deleted');
      const noBirthdayId = await createBirthday(userId, 'No Birthday', '1991-06-02', 'people/no-birthday');
      const untouchedId = await createBirthday(userId, 'Untouched Person', '1992-07-03', 'people/untouched');
      respondWithPages({
        connections: [person('deleted', { deleted: true }), person('no-birthday', { name: 'No Birthday' })],
        nextSyncToken: 'next-token',
      });

      await service.runSync(userId, INCREMENTAL);

      expect(requestedParams(0).get('syncToken')).toBe('saved-token');
      expect(requestedParams(0).get('requestSyncToken')).toBe('true');
      expect(await findBirthday(deletedId)).toMatchObject({ name: 'Deleted Person', googleContactId: null, googleContactSnapshot: null });
      expect(await findBirthday(noBirthdayId)).toMatchObject({ name: 'No Birthday', googleContactId: null, googleContactSnapshot: null });
      expect(await findBirthday(untouchedId)).toMatchObject({
        googleContactId: 'people/untouched',
        googleContactSnapshot: '1992-07-03|Untouched Person',
      });
      expect(pushQueue.birthdayChanged).toHaveBeenCalledTimes(2);
      expect(pushQueue.birthdayChanged).toHaveBeenCalledWith({ userId, birthdayId: deletedId, deletedGoogleEventId: null });
      expect(pushQueue.birthdayChanged).toHaveBeenCalledWith({ userId, birthdayId: noBirthdayId, deletedGoogleEventId: null });
      expect(connections.markSynced).toHaveBeenCalledWith(userId);
    });

    it('updates a linked birthday changed in Google later than in Birthdly', async () => {
      const userId = await createConnectedUser('saved-token');
      const linkedId = await createBirthday(userId, 'Old Name', '1990-05-01', 'people/linked');
      respondWithPages({
        connections: [person('linked', { name: 'New Name', date: { year: 1990, month: 5, day: 2 } })],
        nextSyncToken: 'next-token',
      });

      const summary = await service.runSync(userId, INCREMENTAL);

      expect(summary).toEqual({ added: 0, updated: 1, deleted: 0 });
      expect(await findBirthday(linkedId)).toMatchObject({
        name: 'New Name',
        birthDate: '1990-05-02',
        googleContactId: 'people/linked',
        googleContactSnapshot: '1990-05-02|New Name',
      });
    });

    it('links a birthday of the same person and adds a contact that matches no birthday', async () => {
      const userId = await createConnectedUser('saved-token');
      const sameId = await createBirthday(userId, 'Same Person', '1990-05-01');
      respondWithPages({
        connections: [
          person('same', { name: 'same  person', date: { month: 5, day: 1 } }),
          person('new', { name: 'New Person', date: { year: 2000, month: 1, day: 15 } }),
        ],
        nextSyncToken: 'next-token',
      });

      const summary = await service.runSync(userId, INCREMENTAL);
      const added = await db.select().from(birthdays).where(eq(birthdays.googleContactId, 'people/new'));

      expect(summary).toEqual({ added: 1, updated: 0, deleted: 0 });
      expect(await findBirthday(sameId)).toMatchObject({ name: 'Same Person', googleContactId: 'people/same' });
      expect(pushQueue.birthdayChanged).toHaveBeenCalledWith({ userId, birthdayId: sameId, deletedGoogleEventId: null });
      expect(added).toHaveLength(1);
      expect(added[0]).toMatchObject({ userId, name: 'New Person', birthDate: '2000-01-15', googleContactSnapshot: '2000-01-15|New Person' });
    });
  });

  describe('contacts sync token', () => {
    it('saves the sync token of the last page for the connection read before the access token', async () => {
      const userId = await createConnectedUser('saved-token');
      respondWithPages({ connections: [], nextPageToken: 'page-2', nextSyncToken: 'page-1-token' }, { connections: [], nextSyncToken: 'last-token' });

      await service.runSync(userId, INCREMENTAL);

      expect(requestedParams(1).get('pageToken')).toBe('page-2');
      expect(requestedParams(1).get('syncToken')).toBe('saved-token');
      expect(connections.saveContactsSyncToken).toHaveBeenCalledTimes(1);
      expect(connections.saveContactsSyncToken).toHaveBeenCalledWith(userId, CONNECTED_AT, 'last-token');
      expect(connections.readContactsSyncToken.mock.invocationCallOrder[0]).toBeLessThan(connections.getAccessToken.mock.invocationCallOrder[0]);
    });

    it('does not save the sync token and releases the lease when the import fails', async () => {
      const userId = await createConnectedUser('saved-token');
      await createBirthday(userId, 'Deleted Person', '1990-05-01', 'people/deleted');
      respondWithPages({ connections: [person('deleted', { deleted: true })], nextSyncToken: 'next-token' });
      pushQueue.birthdayChanged.mockRejectedValue(new Error('Queue down'));

      await expect(service.runSync(userId, INCREMENTAL)).rejects.toThrow('Queue down');

      const [connection] = await db.select().from(googleCalendarConnections).where(eq(googleCalendarConnections.userId, userId));
      expect(connections.saveContactsSyncToken).not.toHaveBeenCalled();
      expect(connections.markSynced).not.toHaveBeenCalled();
      expect(connection.syncRunningUntil).toBe('-infinity');
    });
  });

  describe('sync lease', () => {
    it('returns null without reading Google while another sync of the user runs', async () => {
      const userId = await createConnectedUser('saved-token');
      await db
        .update(googleCalendarConnections)
        .set({ syncRunningUntil: new Date(Date.now() + 60_000).toISOString() })
        .where(eq(googleCalendarConnections.userId, userId));

      expect(await service.runSync(userId, INCREMENTAL)).toBeNull();
      expect(connections.getAccessToken).not.toHaveBeenCalled();
      expect(api.request).not.toHaveBeenCalled();
    });

    it('returns null when the last sync started less than the minimum interval ago', async () => {
      const userId = await createConnectedUser('saved-token');
      await db.update(googleCalendarConnections).set({ lastPulledAt: new Date().toISOString() }).where(eq(googleCalendarConnections.userId, userId));

      expect(await service.runSync(userId, { minIntervalMs: 60_000, full: false })).toBeNull();
      expect(api.request).not.toHaveBeenCalled();
    });

    it('returns null for a user who is not connected', async () => {
      const userId = await createConnectedUser('saved-token');
      await db.update(googleCalendarConnections).set({ status: 'revoked' }).where(eq(googleCalendarConnections.userId, userId));

      expect(await service.runSync(userId, FULL)).toBeNull();
      expect(api.request).not.toHaveBeenCalled();
    });
  });
});
