import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DrizzleSnapshotJSON, generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { sql } from 'drizzle-orm';
import { execFile } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { DATABASE } from './constants';
import { DatabaseModule } from './database.module';
import * as schema from './schema';
import { Database } from './types';

// drizzle-kit types the snapshot tables through zod, which resolves to `unknown` here; these are the parts compared.
interface SnapshotIndex {
  name: string;
  isUnique: boolean;
  method: string;
  columns: { expression: string }[];
  where?: string;
}

interface SnapshotTable {
  checkConstraints: Record<string, unknown>;
  indexes: Record<string, SnapshotIndex>;
}

const CONTAINER_TIMEOUT_MS = 120_000;
const MIGRATIONS_FOLDER = join(import.meta.dirname, '../../migrations');
const DRIZZLE_KIT_BIN = join(dirname(createRequire(import.meta.url).resolve('drizzle-kit')), 'bin.cjs');
// One per SQL file in libs/api/database/migrations.
const MIGRATION_COUNT = readdirSync(MIGRATIONS_FOLDER).filter((file: string) => file.endsWith('.sql')).length;
const TABLES = [
  'birthdays',
  'celebrities',
  'celebrity_imports',
  'google_calendar_connections',
  'notification_deliveries',
  'notification_settings',
  'push_subscriptions',
  'sessions',
  'users',
];

describe('DatabaseModule with a real Postgres', () => {
  let container: StartedPostgreSqlContainer;
  const moduleRefs: TestingModule[] = [];

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
  }, CONTAINER_TIMEOUT_MS);

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await Promise.all(moduleRefs.map((moduleRef) => moduleRef.close()));
    await container?.stop();
  }, CONTAINER_TIMEOUT_MS);

  async function bootstrapDatabase(): Promise<Database> {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ connectionString: container.getConnectionUri(), migrationsFolder: MIGRATIONS_FOLDER })],
    }).compile();
    moduleRefs.push(moduleRef);

    await moduleRef.init();

    return moduleRef.get<Database>(DATABASE);
  }

  async function countAppliedMigrations(db: Database): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`select count(*)::int as count from drizzle.__drizzle_migrations`);

    return result.rows[0].count;
  }

  // The tests share one database and run in order: the first bootstrap migrates the empty database.
  it('creates every table and records both migrations on bootstrap', async () => {
    const db = await bootstrapDatabase();

    const tables = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );

    expect(tables.rows.map((row) => row.table_name)).toEqual(TABLES);
    expect(await countAppliedMigrations(db)).toBe(MIGRATION_COUNT);
  });

  it('creates the time zone check function', async () => {
    const db = await bootstrapDatabase();

    const result = await db.execute<{ berlin: boolean; mars: boolean }>(
      sql`select public.is_valid_time_zone('Europe/Berlin') as berlin, public.is_valid_time_zone('Mars/Phobos') as mars`,
    );

    expect(result.rows[0]).toEqual({ berlin: true, mars: false });
  });

  it('does nothing when the migrations were already applied', async () => {
    const db = await bootstrapDatabase();

    expect(await countAppliedMigrations(db)).toBe(MIGRATION_COUNT);
  });

  // `pushSchema` from `drizzle-kit/api` 0.31 drops query parameters and fails on the composite primary key of
  // `notification_deliveries`, so the database is introspected with `drizzle-kit pull` instead. Postgres rewrites
  // check expressions and index predicates, so those are compared by name and shape and everything else exactly.
  it('leaves no difference between the Drizzle schema and the migrated database', async () => {
    await bootstrapDatabase();
    const declared = generateDrizzleJson(schema);
    const live = await pullDatabaseSnapshot(container.getConnectionUri());
    const declaredTables = declared.tables as Record<string, SnapshotTable>;
    const liveTables = live.tables as Record<string, SnapshotTable>;

    expect(Object.keys(liveTables).sort()).toEqual(Object.keys(declaredTables).sort());

    for (const [key, declaredTable] of Object.entries(declaredTables)) {
      const liveTable = liveTables[key];

      expect(describeChecksAndIndexes(liveTable), key).toEqual(describeChecksAndIndexes(declaredTable));

      liveTable.checkConstraints = declaredTable.checkConstraints;
      liveTable.indexes = declaredTable.indexes;
    }

    expect(await generateMigration(live, declared)).toEqual([]);
  });
});

async function pullDatabaseSnapshot(connectionUri: string): Promise<DrizzleSnapshotJSON> {
  const outDir = await mkdtemp(join(tmpdir(), 'drizzle-pull-'));

  try {
    await promisify(execFile)(
      process.execPath,
      [DRIZZLE_KIT_BIN, 'pull', '--dialect=postgresql', `--url=${connectionUri}`, `--out=${outDir}`, '--schemaFilters=public'],
      { cwd: outDir },
    );

    return JSON.parse(await readFile(join(outDir, 'meta', '0000_snapshot.json'), 'utf8')) as DrizzleSnapshotJSON;
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

function describeChecksAndIndexes(table: SnapshotTable): unknown {
  return {
    checks: Object.keys(table.checkConstraints).sort(),
    indexes: Object.values(table.indexes)
      .map((index) => ({
        name: index.name,
        isUnique: index.isUnique,
        method: index.method,
        columns: index.columns.map((column) => column.expression),
        partial: Boolean(index.where),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
