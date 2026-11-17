import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { PG_BOSS } from './constants';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './jobs.module-definition';
import { JobsModuleOptions } from './types';

// Lets running jobs finish when Docker stops the container; Docker kills it after 10 seconds anyway.
const STOP_TIMEOUT_MS = 8000;
const logger: Logger = new Logger('JobsModule');

// Background jobs in Postgres (pg-boss). The jobs live in the `pgboss` schema of the application database, so a job
// survives a restart, and failed jobs are retried. Starting creates or migrates that schema; when it fails, the API does
// not start.
@Global()
@Module({
  providers: [
    {
      provide: PG_BOSS,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: JobsModuleOptions): Promise<PgBoss> => startPgBoss(options),
    },
  ],
  exports: [PG_BOSS],
})
export class JobsModule extends ConfigurableModuleClass implements OnApplicationShutdown {
  constructor(@Inject(PG_BOSS) private readonly boss: PgBoss) {
    super();
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.boss.stop({ graceful: true, timeout: STOP_TIMEOUT_MS });
  }
}

async function startPgBoss(options: JobsModuleOptions): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString: options.connectionString });

  // pg-boss reports failures of its own background work (polling, maintenance) here; without a listener Node exits.
  boss.on('error', (error: Error) => logger.error({ err: error }, 'pg-boss failed'));
  await boss.start();
  return boss;
}
