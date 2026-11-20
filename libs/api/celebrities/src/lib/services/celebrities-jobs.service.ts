import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { setTimeout as delay } from 'node:timers/promises';
import { Job, JobInsert, PgBoss } from 'pg-boss';
import { PG_BOSS } from '@birthday/api-jobs';
import {
  CELEBRITIES_DETAILS_QUEUE,
  CELEBRITIES_PAGEVIEWS_QUEUE,
  CELEBRITIES_SEGMENT_QUEUE,
  CELEBRITY_SEGMENTS,
  WIKIDATA_ENTITIES_PER_REQUEST,
} from '../constants';
import { CelebrityDetailsJob, CelebrityPageviewsJob, CelebritySegmentJob } from '../types';
import { CelebritiesImportService } from './celebrities-import.service';

// `stately` with the segment as `singletonKey`: at most one waiting and one running import per segment. Failures retry
// with growing pauses (10 min, 20 min, ...), which outlasts a QLever or Wikidata outage.
const SEGMENT_QUEUE_OPTIONS = { policy: 'stately', retryLimit: 4, retryDelay: 10 * 60, retryBackoff: true, expireInSeconds: 15 * 60 } as const;
const DETAILS_QUEUE_OPTIONS = { retryLimit: 6, retryDelay: 60, retryBackoff: true, expireInSeconds: 5 * 60 };
// Page views run into Wikimedia's rate limit on large imports: more retries, but at most 30 min apart, outlast a few hours
// of throttling.
const PAGEVIEWS_QUEUE_OPTIONS = { retryLimit: 10, retryDelay: 2 * 60, retryDelayMax: 30 * 60, retryBackoff: true, expireInSeconds: 30 * 60 };
// One details request at a time with a pause after it keeps the import gentle on Wikidata; it has no deadline.
const DETAILS_PAUSE_MS = 1000;

// Declares the celebrity import queues and works their jobs: a segment job saves the segment's people and queues their
// details in batches of 50; each details job queues the page views of the people it kept.
@Injectable()
export class CelebritiesJobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CelebritiesJobsService.name);

  constructor(
    @Inject(PG_BOSS) private readonly boss: PgBoss,
    private readonly importService: CelebritiesImportService,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    // `createQueue` keeps an existing queue's settings, so changed options need `updateQueue` too.
    await this.boss.createQueue(CELEBRITIES_SEGMENT_QUEUE, SEGMENT_QUEUE_OPTIONS);
    await this.boss.updateQueue(CELEBRITIES_SEGMENT_QUEUE, {
      retryLimit: SEGMENT_QUEUE_OPTIONS.retryLimit,
      retryDelay: SEGMENT_QUEUE_OPTIONS.retryDelay,
      retryBackoff: SEGMENT_QUEUE_OPTIONS.retryBackoff,
      expireInSeconds: SEGMENT_QUEUE_OPTIONS.expireInSeconds,
    });
    await this.boss.createQueue(CELEBRITIES_DETAILS_QUEUE, DETAILS_QUEUE_OPTIONS);
    await this.boss.updateQueue(CELEBRITIES_DETAILS_QUEUE, DETAILS_QUEUE_OPTIONS);
    await this.boss.createQueue(CELEBRITIES_PAGEVIEWS_QUEUE, PAGEVIEWS_QUEUE_OPTIONS);
    await this.boss.updateQueue(CELEBRITIES_PAGEVIEWS_QUEUE, PAGEVIEWS_QUEUE_OPTIONS);
    await this.boss.work<CelebritySegmentJob>(CELEBRITIES_SEGMENT_QUEUE, ([job]: Job<CelebritySegmentJob>[]) => this.runSegment(job.data));
    await this.boss.work<CelebrityDetailsJob>(CELEBRITIES_DETAILS_QUEUE, ([job]: Job<CelebrityDetailsJob>[]) => this.runDetails(job.data));
    await this.boss.work<CelebrityPageviewsJob>(CELEBRITIES_PAGEVIEWS_QUEUE, ([job]: Job<CelebrityPageviewsJob>[]) =>
      this.importService.loadPageviews(job.data.ids),
    );
    // A segment added since the last deployment is imported now; the job checks whether it was imported before, so this
    // does not depend on the database migrations having finished yet.
    await sendSegmentJobs(
      this.boss,
      CELEBRITY_SEGMENTS.map(({ key }) => key),
      true,
    );
  }

  private async runSegment({ segment, onlyIfNew }: CelebritySegmentJob): Promise<void> {
    if (onlyIfNew && (await this.importService.wasImported(segment))) {
      return;
    }

    const ids: string[] = await this.importService.importSegment(segment);
    const jobs: JobInsert<CelebrityDetailsJob>[] = [];

    for (let index = 0; index < ids.length; index += WIKIDATA_ENTITIES_PER_REQUEST) {
      jobs.push({ data: { ids: ids.slice(index, index + WIKIDATA_ENTITIES_PER_REQUEST) } });
    }

    if (jobs.length) {
      await this.boss.insert(CELEBRITIES_DETAILS_QUEUE, jobs);
    }

    this.logger.log({ segment, people: ids.length }, 'Imported a celebrity segment; its details load in the background');
  }

  private async runDetails({ ids }: CelebrityDetailsJob): Promise<void> {
    const kept: string[] = await this.importService.loadDetails(ids);

    if (kept.length) {
      const job: CelebrityPageviewsJob = { ids: kept };

      await this.boss.send(CELEBRITIES_PAGEVIEWS_QUEUE, job);
    }

    await delay(DETAILS_PAUSE_MS);
  }
}

// Queues an import of each segment; also used by the `celebrities:import` command. Returns the segments that already
// had an import waiting, which pg-boss keeps instead of the new one.
export async function sendSegmentJobs(boss: PgBoss, segments: string[], onlyIfNew: boolean): Promise<string[]> {
  const waiting: string[] = [];

  for (const segment of segments) {
    const job: CelebritySegmentJob = { segment, onlyIfNew };

    if (!(await boss.send(CELEBRITIES_SEGMENT_QUEUE, job, { singletonKey: segment }))) {
      waiting.push(segment);
    }
  }

  return waiting;
}
