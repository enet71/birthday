import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Pool } from 'pg';
import { Database } from '../types';
import * as schema from './index';
import { birthdays, googleCalendarConnections, notificationDeliveries, notificationSettings, pushSubscriptions, users } from './index';

const CONTAINER_TIMEOUT_MS = 120_000;
const MIGRATIONS_FOLDER = join(import.meta.dirname, '../../../migrations');
const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';

describe('database schema with a real Postgres', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let db: Database;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    db = drizzle({ client: pool, schema });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  }, CONTAINER_TIMEOUT_MS);

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  }, CONTAINER_TIMEOUT_MS);

  // Every test works with its own users, so the tests do not depend on each other's rows.
  async function insertUser(): Promise<string> {
    const [user] = await db.insert(users).values({ googleSub: randomUUID(), email: 'person@example.com' }).returning({ id: users.id });

    return user.id;
  }

  // Drizzle wraps the Postgres error, which carries the name of the violated constraint.
  async function violatedConstraint(query: PromiseLike<unknown>): Promise<string | undefined> {
    try {
      await query;
    } catch (error) {
      return (error as { cause?: { constraint?: string } }).cause?.constraint;
    }

    throw new Error('Expected the query to violate a constraint');
  }

  describe('birthdays', () => {
    function insertBirthday(userId: string, values: Partial<typeof birthdays.$inferInsert>): PromiseLike<unknown> {
      return db.insert(birthdays).values({ userId, name: 'Anna', birthDate: '1990-05-01', ...values });
    }

    it.each(['', '   ', 'a'.repeat(201)])('rejects the name %j', async (name) => {
      const userId = await insertUser();

      expect(await violatedConstraint(insertBirthday(userId, { name }))).toBe('birthdays_name_check');
    });

    it('accepts a name of 200 characters', async () => {
      const userId = await insertUser();

      await expect(insertBirthday(userId, { name: 'a'.repeat(200) })).resolves.not.toThrow();
    });

    it('rejects notes longer than 500 characters', async () => {
      const userId = await insertUser();

      expect(await violatedConstraint(insertBirthday(userId, { notes: 'a'.repeat(501) }))).toBe('birthdays_notes_check');
    });

    it('rejects an unknown relationship', async () => {
      const userId = await insertUser();

      expect(
        await violatedConstraint(
          db.execute(sql`insert into birthdays (user_id, name, birth_date, relationship) values (${userId}, 'Anna', '1990-05-01', 'enemies')`),
        ),
      ).toBe('birthdays_relationship_check');
    });

    it('accepts a missing relationship', async () => {
      const userId = await insertUser();

      await expect(insertBirthday(userId, { relationship: null })).resolves.not.toThrow();
    });

    it('stores a birth date with an unknown year', async () => {
      const userId = await insertUser();
      await insertBirthday(userId, { birthDate: '0004-02-29' });

      const [birthday] = await db.select().from(birthdays).where(eq(birthdays.userId, userId));

      expect(birthday.birthDate).toBe('0004-02-29');
    });

    it('sets updated_at to the database time when Drizzle updates a row', async () => {
      const userId = await insertUser();
      const [created] = await db
        .insert(birthdays)
        .values({ userId, name: 'Anna', birthDate: '1990-05-01' })
        .returning({ id: birthdays.id, createdAt: birthdays.createdAt, updatedAt: birthdays.updatedAt });
      await new Promise((resolve) => setTimeout(resolve, 20));

      const [updated] = await db
        .update(birthdays)
        .set({ name: 'Anne' })
        .where(eq(birthdays.id, created.id))
        .returning({ createdAt: birthdays.createdAt, updatedAt: birthdays.updatedAt });
      const [{ now }] = (await db.execute<{ now: string }>(sql`select now()::text as now`)).rows;

      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(new Date(now).getTime());
      expect(updated.createdAt).toEqual(created.createdAt);
    });
  });

  describe('notification_settings', () => {
    function insertSettings(userId: string, values: Partial<typeof notificationSettings.$inferInsert>): PromiseLike<unknown> {
      return db.insert(notificationSettings).values({ userId, timeZone: 'Europe/Berlin', ...values });
    }

    it.each([-1, 24])('rejects the hour %i', async (hour) => {
      const userId = await insertUser();

      expect(await violatedConstraint(insertSettings(userId, { hour }))).toBe('notification_settings_hour_check');
    });

    it('rejects an unknown time zone', async () => {
      const userId = await insertUser();

      expect(await violatedConstraint(insertSettings(userId, { timeZone: 'Mars/Phobos' }))).toBe('notification_settings_time_zone_check');
    });

    it('accepts a known time zone with the default reminders', async () => {
      const userId = await insertUser();
      await insertSettings(userId, { timeZone: 'Europe/Berlin' });

      const [settings] = await db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId));

      expect(settings).toEqual({
        userId,
        remindOnDay: true,
        remindDayBefore: true,
        hour: 9,
        timeZone: 'Europe/Berlin',
        locale: 'en',
      });
    });

    it('rejects turning off both reminders', async () => {
      const userId = await insertUser();

      expect(await violatedConstraint(insertSettings(userId, { remindOnDay: false, remindDayBefore: false }))).toBe('notification_settings_check');
    });

    it('rejects an unsupported locale', async () => {
      const userId = await insertUser();

      expect(
        await violatedConstraint(
          db.execute(sql`insert into notification_settings (user_id, time_zone, locale) values (${userId}, 'Europe/Berlin', 'it')`),
        ),
      ).toBe('notification_settings_locale_check');
    });
  });

  describe('push_subscriptions', () => {
    function insertSubscription(userId: string, values: Partial<typeof pushSubscriptions.$inferInsert>): PromiseLike<unknown> {
      return db.insert(pushSubscriptions).values({ userId, endpoint: FCM_ENDPOINT, p256dh: 'key', auth: 'secret', ...values });
    }

    it.each(['https://evil.example.com/x', 'https://fcm.googleapis.com.evil.example.com/x', 'http://fcm.googleapis.com/x'])(
      'rejects the endpoint %s',
      async (endpoint) => {
        const userId = await insertUser();

        expect(await violatedConstraint(insertSubscription(userId, { endpoint }))).toBe('push_subscriptions_endpoint_check');
      },
    );

    it('accepts a Firebase Cloud Messaging endpoint', async () => {
      const userId = await insertUser();

      await expect(insertSubscription(userId, {})).resolves.not.toThrow();
    });

    it('rejects the same endpoint twice for one user', async () => {
      const userId = await insertUser();
      await insertSubscription(userId, {});

      expect(await violatedConstraint(insertSubscription(userId, {}))).toBe('push_subscriptions_user_id_endpoint_key');
    });

    it('accepts the same endpoint for another user', async () => {
      await insertSubscription(await insertUser(), {});

      await expect(insertSubscription(await insertUser(), {})).resolves.not.toThrow();
    });

    it('rejects an empty p256dh key', async () => {
      const userId = await insertUser();

      expect(await violatedConstraint(insertSubscription(userId, { p256dh: '' }))).toBe('push_subscriptions_p256dh_check');
    });

    it('rejects an empty auth secret', async () => {
      const userId = await insertUser();

      expect(await violatedConstraint(insertSubscription(userId, { auth: '' }))).toBe('push_subscriptions_auth_check');
    });
  });

  describe('users', () => {
    it('rejects a second user with the same Google account', async () => {
      const googleSub = randomUUID();
      await db.insert(users).values({ googleSub, email: 'first@example.com' });

      expect(await violatedConstraint(db.insert(users).values({ googleSub, email: 'second@example.com' }))).toBe('users_google_sub_unique');
    });
  });

  describe('google_calendar_connections', () => {
    it('rejects an unknown status', async () => {
      const userId = await insertUser();

      expect(await violatedConstraint(db.execute(sql`insert into google_calendar_connections (user_id, status) values (${userId}, 'paused')`))).toBe(
        'google_calendar_connections_status_check',
      );
    });

    it('reads the -infinity defaults as strings', async () => {
      const userId = await insertUser();
      await db.insert(googleCalendarConnections).values({ userId, status: 'connected' });

      const [connection] = await db.select().from(googleCalendarConnections).where(eq(googleCalendarConnections.userId, userId));

      expect(connection).toMatchObject({
        status: 'connected',
        lastSyncedAt: null,
        lastPulledAt: '-infinity',
        syncRunningUntil: '-infinity',
        deletionsCheckedAt: '-infinity',
      });
      expect(connection.connectedAt).toBeInstanceOf(Date);
    });
  });

  describe('deleting a user', () => {
    async function insertEverything(userId: string): Promise<void> {
      await db.insert(birthdays).values({ userId, name: 'Anna', birthDate: '1990-05-01' });
      await db.insert(notificationSettings).values({ userId, timeZone: 'Europe/Berlin' });
      await db.insert(notificationDeliveries).values({ userId, localDate: '2026-11-17' });
      await db.insert(pushSubscriptions).values({ userId, endpoint: FCM_ENDPOINT, p256dh: 'key', auth: 'secret' });
      await db.insert(googleCalendarConnections).values({ userId, status: 'connected' });
    }

    async function countRows(userId: string): Promise<Record<string, number>> {
      const result = await db.execute<Record<string, number>>(sql`
        select
          (select count(*)::int from birthdays where user_id = ${userId}) as birthdays,
          (select count(*)::int from notification_settings where user_id = ${userId}) as notification_settings,
          (select count(*)::int from notification_deliveries where user_id = ${userId}) as notification_deliveries,
          (select count(*)::int from push_subscriptions where user_id = ${userId}) as push_subscriptions,
          (select count(*)::int from google_calendar_connections where user_id = ${userId}) as google_calendar_connections
      `);

      return result.rows[0];
    }

    it("deletes the user's rows in every table and keeps the rows of other users", async () => {
      const deletedUserId = await insertUser();
      const otherUserId = await insertUser();
      await insertEverything(deletedUserId);
      await insertEverything(otherUserId);

      await db.delete(users).where(eq(users.id, deletedUserId));

      const none = {
        birthdays: 0,
        notification_settings: 0,
        notification_deliveries: 0,
        push_subscriptions: 0,
        google_calendar_connections: 0,
      };
      expect(await countRows(deletedUserId)).toEqual(none);
      expect(await countRows(otherUserId)).toEqual({
        birthdays: 1,
        notification_settings: 1,
        notification_deliveries: 1,
        push_subscriptions: 1,
        google_calendar_connections: 1,
      });
    });
  });
});
