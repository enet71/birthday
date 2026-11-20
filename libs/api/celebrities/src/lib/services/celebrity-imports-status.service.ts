import { Inject, Injectable } from '@nestjs/common';
import { count, sql } from 'drizzle-orm';
import { celebrities, celebrityImports, Database, DATABASE } from '@birthday/api-database';
import {
  CELEBRITY_JOB_STATES,
  CelebrityImportFailureDto,
  CelebrityImportProgressDto,
  CelebrityImportQueueDto,
  CelebrityImportsStatusResponse,
  CelebrityJobState,
  CelebritySegmentImportDto,
} from '@birthday/shared-models';
import { CELEBRITIES_DETAILS_QUEUE, CELEBRITIES_PAGEVIEWS_QUEUE, CELEBRITIES_SEGMENT_QUEUE, CELEBRITY_SEGMENTS } from '../constants';
import { getSegmentImportStatus } from '../helpers';

const QUEUES: string[] = [CELEBRITIES_SEGMENT_QUEUE, CELEBRITIES_DETAILS_QUEUE, CELEBRITIES_PAGEVIEWS_QUEUE];
const FAILURES_LIMIT = 20;
const ERROR_MAX_LENGTH = 500;

interface QueueStateRow extends Record<string, unknown> {
  name: string;
  state: string;
  count: number;
}

interface FailureRow extends Record<string, unknown> {
  name: string;
  state: CelebrityImportFailureDto['state'];
  at: Date | string;
  error: string | null;
}

// What the admin page shows about the celebrity import. The job counts come straight from pg-boss's own table
// (`pgboss.job`), since pg-boss has no API that lists jobs by state.
@Injectable()
export class CelebrityImportsStatusService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  public async getStatus(): Promise<CelebrityImportsStatusResponse> {
    const [segments, progress, queues, failures] = await Promise.all([this.getSegments(), this.getProgress(), this.getQueues(), this.getFailures()]);

    return { segments, progress, queues, failures, checkedAt: new Date().toISOString() };
  }

  private async getSegments(): Promise<CelebritySegmentImportDto[]> {
    const rows = await this.db.select().from(celebrityImports);

    return CELEBRITY_SEGMENTS.map(({ key }) => {
      const row = rows.find(({ segment }) => segment === key);

      return {
        segment: key,
        status: getSegmentImportStatus(row),
        startedAt: row?.startedAt.toISOString() ?? null,
        finishedAt: row?.finishedAt?.toISOString() ?? null,
        people: row?.people ?? null,
        error: row?.error ?? null,
      };
    });
  }

  private async getProgress(): Promise<CelebrityImportProgressDto> {
    const [row] = await this.db
      .select({ people: count(), withDetails: count(celebrities.detailsLoadedAt), withPageviews: count(celebrities.pageviewsLoadedAt) })
      .from(celebrities);

    return row;
  }

  private async getQueues(): Promise<CelebrityImportQueueDto[]> {
    const { rows } = await this.db.execute<QueueStateRow>(sql`
      select name, state, count(*)::int as count
      from pgboss.job
      where name in (${sql.join(
        QUEUES.map((queue: string) => sql`${queue}`),
        sql`, `,
      )})
      group by name, state
    `);

    return QUEUES.map((queue: string) => ({
      queue,
      counts: Object.fromEntries(
        CELEBRITY_JOB_STATES.map((state: CelebrityJobState) => [
          state,
          rows.find((row: QueueStateRow) => row.name === queue && row.state === state)?.count ?? 0,
        ]),
      ) as Record<CelebrityJobState, number>,
    }));
  }

  private async getFailures(): Promise<CelebrityImportFailureDto[]> {
    const { rows } = await this.db.execute<FailureRow>(sql`
      select name, state::text as state, coalesce(completed_on, started_on, created_on) as at,
        coalesce(output->>'message', output::text) as error
      from pgboss.job
      where name in (${sql.join(
        QUEUES.map((queue: string) => sql`${queue}`),
        sql`, `,
      )})
        and state in ('failed', 'retry')
      order by at desc
      limit ${FAILURES_LIMIT}
    `);

    return rows.map(({ name, state, at, error }: FailureRow) => ({
      queue: name,
      state,
      at: new Date(at).toISOString(),
      error: (error ?? 'Unknown error').slice(0, ERROR_MAX_LENGTH),
    }));
  }
}
