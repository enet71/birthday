import type { Mock } from 'vitest';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DATABASE, Database, DatabaseModule, googleCalendarConnections, users } from '@birthday/api-database';
import { GoogleConnectionsService } from './google-connections.service';
import { GoogleOAuthService } from './google-oauth.service';
import { TokenCipher } from './token-cipher.service';

const CONTAINER_TIMEOUT_MS = 120_000;
const MIGRATIONS_FOLDER = join(import.meta.dirname, '../../../../database/migrations');
const MINUTE_MS = 60 * 1000;

type ConnectionValues = Partial<Omit<typeof googleCalendarConnections.$inferInsert, 'userId'>>;

describe('GoogleConnectionsService with a real Postgres', () => {
  let container: StartedPostgreSqlContainer;
  let moduleRef: TestingModule;
  let db: Database;
  let service: GoogleConnectionsService;

  const cipher: { encrypt: Mock<TokenCipher['encrypt']>; decrypt: Mock<TokenCipher['decrypt']> } = {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  };

  beforeAll(async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ connectionString: container.getConnectionUri(), migrationsFolder: MIGRATIONS_FOLDER })],
      providers: [GoogleConnectionsService, { provide: GoogleOAuthService, useValue: {} }, { provide: TokenCipher, useValue: cipher }],
    }).compile();
    await moduleRef.init();

    db = moduleRef.get<Database>(DATABASE);
    service = moduleRef.get(GoogleConnectionsService);
  }, CONTAINER_TIMEOUT_MS);

  afterAll(async () => {
    await moduleRef?.close();
    await container?.stop();
    vi.restoreAllMocks();
  }, CONTAINER_TIMEOUT_MS);

  beforeEach(() => {
    vi.clearAllMocks();
    cipher.encrypt.mockReturnValue('encrypted-refresh-token');
  });

  async function createUser(): Promise<string> {
    const [user] = await db.insert(users).values({ googleSub: randomUUID(), email: 'person@example.com' }).returning({ id: users.id });

    return user.id;
  }

  async function createConnection(values: ConnectionValues = {}): Promise<string> {
    const userId = await createUser();

    await db.insert(googleCalendarConnections).values({ userId, status: 'connected', ...values });
    return userId;
  }

  function minutesAgo(minutes: number): string {
    return new Date(Date.now() - minutes * MINUTE_MS).toISOString();
  }

  describe('findDueForSync', () => {
    beforeEach(async () => {
      await db.delete(googleCalendarConnections);
    });

    it('returns connected users last pulled before the cutoff, longest waiting first', async () => {
      const pulledLongAgo = await createConnection({ lastPulledAt: minutesAgo(60) });
      const neverPulled = await createConnection();
      const pulledAtCutoff = await createConnection({ lastPulledAt: minutesAgo(20) });
      const leaseExpired = await createConnection({ lastPulledAt: minutesAgo(30), syncRunningUntil: minutesAgo(1) });

      const due = await service.findDueForSync(new Date(minutesAgo(15)), 10);

      expect(due).toEqual([neverPulled, pulledLongAgo, leaseExpired, pulledAtCutoff]);
    });

    it('skips revoked, disconnected, recently pulled and currently syncing users', async () => {
      const due = await createConnection({ lastPulledAt: minutesAgo(60) });
      await createConnection({ status: 'revoked', lastPulledAt: minutesAgo(60) });
      await createConnection({ status: 'disconnected', lastPulledAt: minutesAgo(60) });
      await createConnection({ lastPulledAt: minutesAgo(5) });
      await createConnection({ lastPulledAt: minutesAgo(60), syncRunningUntil: new Date(Date.now() + 5 * MINUTE_MS).toISOString() });

      expect(await service.findDueForSync(new Date(minutesAgo(15)), 10)).toEqual([due]);
    });

    it('returns at most the limit, longest waiting first', async () => {
      const first = await createConnection({ lastPulledAt: minutesAgo(90) });
      const second = await createConnection({ lastPulledAt: minutesAgo(60) });
      await createConnection({ lastPulledAt: minutesAgo(30) });

      expect(await service.findDueForSync(new Date(minutesAgo(15)), 2)).toEqual([first, second]);
    });

    it('returns no users when nobody is due', async () => {
      await createConnection({ lastPulledAt: minutesAgo(1) });

      expect(await service.findDueForSync(new Date(minutesAgo(15)), 10)).toEqual([]);
    });
  });

  describe('contacts sync token', () => {
    it('returns null without a connection', async () => {
      expect(await service.readContactsSyncToken(await createUser())).toBeNull();
    });

    it('saves the token for the connection it was read for', async () => {
      const userId = await createUser();
      await service.saveConnected(userId, 'refresh-token');
      const saved = await service.readContactsSyncToken(userId);

      await service.saveContactsSyncToken(userId, saved?.connectedAt ?? new Date(0), 'next-token');

      expect(saved?.syncToken).toBeNull();
      expect(await service.readContactsSyncToken(userId)).toEqual({ syncToken: 'next-token', connectedAt: saved?.connectedAt });
    });

    it('drops the token of the earlier connection on reconnect', async () => {
      const userId = await createConnection({ connectedAt: new Date('2026-01-01T00:00:00.000Z'), contactsSyncToken: 'old-account-token' });

      await service.saveConnected(userId, 'refresh-token');

      const current = await service.readContactsSyncToken(userId);
      expect(current?.syncToken).toBeNull();
      expect(current?.connectedAt).not.toEqual(new Date('2026-01-01T00:00:00.000Z'));
    });

    it('does not save a token read before a reconnect', async () => {
      const oldConnectedAt = new Date('2026-01-01T00:00:00.000Z');
      const userId = await createConnection({ connectedAt: oldConnectedAt, contactsSyncToken: 'old-account-token' });
      await service.saveConnected(userId, 'refresh-token');

      await service.saveContactsSyncToken(userId, oldConnectedAt, 'token-of-old-account');

      const [connection] = await db.select().from(googleCalendarConnections).where(eq(googleCalendarConnections.userId, userId));
      expect(connection.contactsSyncToken).toBeNull();
    });
  });
});
