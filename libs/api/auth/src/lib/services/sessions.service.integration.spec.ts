import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DATABASE, Database, DatabaseModule, sessions, users } from '@birthday/api-database';
import { hashSessionToken } from '../utils';
import { AuthUsersService } from './auth-users.service';
import { SessionsService } from './sessions.service';

const CONTAINER_TIMEOUT_MS = 120_000;
const MIGRATIONS_FOLDER = join(import.meta.dirname, '../../../../database/migrations');
const DAY_MS = 24 * 60 * 60 * 1000;
// Statements run in separate transactions, so their `now()` differs by the time between them.
const CLOCK_TOLERANCE_MS = 10_000;

// Postgres intervals relative to the database clock.
interface SessionTimes {
  lastUsedAgo?: string;
  expiresIn?: string;
  absoluteExpiresIn?: string;
}

describe('SessionsService and AuthUsersService with a real Postgres', () => {
  let container: StartedPostgreSqlContainer;
  let moduleRef: TestingModule;
  let db: Database;
  let sessionsService: SessionsService;
  let authUsers: AuthUsersService;

  beforeAll(async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ connectionString: container.getConnectionUri(), migrationsFolder: MIGRATIONS_FOLDER })],
      providers: [SessionsService, AuthUsersService],
    }).compile();
    await moduleRef.init();

    db = moduleRef.get<Database>(DATABASE);
    sessionsService = moduleRef.get(SessionsService);
    authUsers = moduleRef.get(AuthUsersService);
  }, CONTAINER_TIMEOUT_MS);

  afterAll(async () => {
    await moduleRef?.close();
    await container?.stop();
    vi.restoreAllMocks();
  }, CONTAINER_TIMEOUT_MS);

  // Every test works with its own user, so the tests do not depend on each other's rows.
  async function createUser(): Promise<string> {
    const user = await authUsers.upsertGoogleUser({ sub: randomUUID(), email: 'person@example.com', name: 'Person' });

    return user.id;
  }

  async function databaseNow(): Promise<number> {
    const result = await db.execute<{ now: Date }>(sql`select now() as now`);

    return new Date(result.rows[0].now).getTime();
  }

  function findSession(token: string): Promise<(typeof sessions.$inferSelect)[]> {
    return db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(token)));
  }

  async function setSession(token: string, values: SessionTimes): Promise<void> {
    const parts = [
      values.lastUsedAgo === undefined ? undefined : sql`last_used_at = now() - ${sql.raw(`interval '${values.lastUsedAgo}'`)}`,
      values.expiresIn === undefined ? undefined : sql`expires_at = now() + ${sql.raw(`interval '${values.expiresIn}'`)}`,
      values.absoluteExpiresIn === undefined ? undefined : sql`absolute_expires_at = now() + ${sql.raw(`interval '${values.absoluteExpiresIn}'`)}`,
    ].filter((part) => part !== undefined);

    await db.execute(sql`update sessions set ${sql.join(parts, sql`, `)} where token_hash = ${hashSessionToken(token)}`);
  }

  function expectCloseTo(actual: Date, expectedMs: number): void {
    expect(Math.abs(actual.getTime() - expectedMs)).toBeLessThan(CLOCK_TOLERANCE_MS);
  }

  describe('create', () => {
    it('stores only the hash of the token, with an end in 30 days and an absolute end in 180 days', async () => {
      const userId = await createUser();

      const created = await sessionsService.create(userId);
      const now = await databaseNow();
      const rows = await findSession(created.token);
      const tokenRows = await db.select().from(sessions).where(eq(sessions.tokenHash, created.token));

      expect(rows).toHaveLength(1);
      expect(tokenRows).toHaveLength(0);
      expect(rows[0].userId).toBe(userId);
      expect(rows[0].expiresAt).toEqual(created.expiresAt);
      expectCloseTo(created.expiresAt, now + 30 * DAY_MS);
      expectCloseTo(rows[0].absoluteExpiresAt, now + 180 * DAY_MS);
    });

    it("drops the user's ended sessions and keeps live ones and other users' sessions", async () => {
      const userId = await createUser();
      const otherUserId = await createUser();
      const ended = await sessionsService.create(userId);
      const live = await sessionsService.create(userId);
      const otherEnded = await sessionsService.create(otherUserId);
      await setSession(ended.token, { expiresIn: '-1 second' });
      await setSession(otherEnded.token, { expiresIn: '-1 second' });

      await sessionsService.create(userId);

      expect(await findSession(ended.token)).toHaveLength(0);
      expect(await findSession(live.token)).toHaveLength(1);
      expect(await findSession(otherEnded.token)).toHaveLength(1);
    });
  });

  describe('authenticate', () => {
    it('returns the user without extending a session used less than a day ago', async () => {
      const userId = await createUser();
      const created = await sessionsService.create(userId);

      const session = await sessionsService.authenticate(created.token);

      expect(session).toEqual({
        user: { id: userId, email: 'person@example.com', name: 'Person' },
        expiresAt: created.expiresAt,
        extended: false,
      });
    });

    it('moves the end of a session last used more than a day ago to 30 days from now', async () => {
      const userId = await createUser();
      const created = await sessionsService.create(userId);
      await setSession(created.token, { lastUsedAgo: '2 days', expiresIn: '28 days' });

      const session = await sessionsService.authenticate(created.token);
      const now = await databaseNow();
      const [row] = await findSession(created.token);

      expect(session?.extended).toBe(true);
      expect(session?.user.id).toBe(userId);
      expectCloseTo(session?.expiresAt ?? new Date(0), now + 30 * DAY_MS);
      expectCloseTo(row.lastUsedAt, now);
    });

    it('does not extend a session past its absolute end', async () => {
      const userId = await createUser();
      const created = await sessionsService.create(userId);
      await setSession(created.token, { lastUsedAgo: '2 days', expiresIn: '1 day', absoluteExpiresIn: '10 days' });
      const [before] = await findSession(created.token);

      const session = await sessionsService.authenticate(created.token);

      expect(session?.extended).toBe(true);
      expect(session?.expiresAt).toEqual(before.absoluteExpiresAt);
    });

    it('returns null for an ended session', async () => {
      const created = await sessionsService.create(await createUser());
      await setSession(created.token, { expiresIn: '-1 second' });

      expect(await sessionsService.authenticate(created.token)).toBeNull();
    });

    it('returns null for an unknown token', async () => {
      expect(await sessionsService.authenticate('unknown-token')).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the session of the token', async () => {
      const created = await sessionsService.create(await createUser());

      await sessionsService.delete(created.token);

      expect(await findSession(created.token)).toHaveLength(0);
      expect(await sessionsService.authenticate(created.token)).toBeNull();
    });
  });

  it("removes a user's sessions with the user", async () => {
    const userId = await createUser();
    const created = await sessionsService.create(userId);

    await db.delete(users).where(eq(users.id, userId));

    expect(await findSession(created.token)).toHaveLength(0);
  });

  describe('upsertGoogleUser', () => {
    it('creates the user on the first sign-in and updates the email and name on later ones', async () => {
      const sub = randomUUID();

      const created = await authUsers.upsertGoogleUser({ sub, email: 'old@example.com', name: 'Old' });
      const updated = await authUsers.upsertGoogleUser({ sub, email: 'new@example.com', name: null });
      const rows = await db.select().from(users).where(eq(users.googleSub, sub));

      expect(created).toEqual({ id: expect.any(String), email: 'old@example.com', name: 'Old' });
      expect(updated).toEqual({ id: created.id, email: 'new@example.com', name: null });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: created.id, email: 'new@example.com', name: null });
    });
  });
});
