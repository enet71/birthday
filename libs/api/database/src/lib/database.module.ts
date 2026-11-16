import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DATABASE, DATABASE_POOL } from './constants';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './database.module-definition';
import * as schema from './schema';
import { Database, DatabaseModuleOptions } from './types';

const CONNECTION_TIMEOUT_MS = 5000;
const logger: Logger = new Logger('DatabaseModule');

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: DatabaseModuleOptions): Pool => createPool(options),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool): Database => drizzle({ client: pool, schema }),
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule extends ConfigurableModuleClass implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {
    super();
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

function createPool(options: DatabaseModuleOptions): Pool {
  // Without a timeout a request waits forever while the database is unreachable.
  const pool = new Pool({ connectionString: options.connectionString, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS });

  // An idle client whose connection drops (a database restart, a network failure) emits `error` on the pool. Without
  // a listener Node treats it as unhandled and exits; the pool has already discarded the client, so logging is enough.
  pool.on('error', (error: Error) => logger.error({ err: error }, 'An idle database connection failed'));

  return pool;
}
