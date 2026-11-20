import { PgBoss } from 'pg-boss';
import { CELEBRITY_SEGMENTS } from '../constants';
import { sendSegmentJobs } from '../services';

// `node main.js celebrities:import [segment]` in the API container: queues a new import of one segment, or of every
// segment, for the running API and exits. It neither migrates nor works jobs itself. Fails when an import of a segment
// is already waiting: pg-boss keeps that one, and it may be the API's start-up job that skips imported segments.
export async function runCelebritiesImportCommand(connectionString: string, segment?: string): Promise<void> {
  const segments: string[] = segment ? [segment] : CELEBRITY_SEGMENTS.map(({ key }) => key);
  const unknown: string | undefined = segments.find((key: string) => !CELEBRITY_SEGMENTS.some((known) => known.key === key));

  if (unknown) {
    throw new Error(`Unknown celebrity segment ${unknown}; known: ${CELEBRITY_SEGMENTS.map(({ key }) => key).join(', ')}`);
  }

  const boss = new PgBoss({ connectionString, supervise: false, schedule: false, migrate: false });

  await boss.start();
  let waiting: string[];

  try {
    waiting = await sendSegmentJobs(boss, segments, false);
  } finally {
    await boss.stop({ graceful: false });
  }

  if (waiting.length) {
    throw new Error(`An import of ${waiting.join(', ')} is already waiting; run the command again once it has started`);
  }
}
