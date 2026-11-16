import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DATABASE_POOL } from './constants';
import { DatabaseModule } from './database.module';

const { FakePool } = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events');

  class FakePool extends EventEmitter {
    public readonly end = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    constructor(public readonly options: unknown) {
      super();
    }
  }

  return { FakePool };
});

vi.mock('pg', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pg')>();

  return { ...actual, Pool: FakePool };
});

describe('DatabaseModule', () => {
  const connectionString = 'postgresql://u:p@localhost:5432/db';
  let moduleRef: TestingModule;
  let pool: InstanceType<typeof FakePool>;

  beforeEach(async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule.forRoot({ connectionString })],
    }).compile();

    pool = moduleRef.get<InstanceType<typeof FakePool>>(DATABASE_POOL);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates the pool from the connection string with a connection timeout', () => {
    expect(pool.options).toEqual({ connectionString, connectionTimeoutMillis: 5000 });
  });

  it('logs an idle connection error instead of crashing', () => {
    const error = new Error('Connection terminated unexpectedly');

    expect(() => pool.emit('error', error)).not.toThrow();
    expect(Logger.prototype.error).toHaveBeenCalledWith({ err: error }, 'An idle database connection failed');
  });

  it('ends the pool on application shutdown', async () => {
    await moduleRef.close();

    expect(pool.end).toHaveBeenCalled();
  });
});
