import { Controller, Get, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DATABASE, Database } from '@birthday/api-database';
import { sql } from 'drizzle-orm';
import { HealthResponse } from './health.types';

@Controller('health')
export class HealthController {
  private readonly logger: Logger = new Logger(HealthController.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  public async check(): Promise<HealthResponse> {
    try {
      await this.db.execute(sql`select 1`);
    } catch (error) {
      this.logger.error({ err: error }, 'The database is unavailable');
      throw new ServiceUnavailableException({ status: 'error' } satisfies HealthResponse);
    }

    return { status: 'ok' };
  }
}
