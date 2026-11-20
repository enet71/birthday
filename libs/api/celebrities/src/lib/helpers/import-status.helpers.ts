import { CelebrityImportStatus } from '@birthday/shared-models';

interface SegmentImportRow {
  finishedAt: Date | null;
  error: string | null;
}

// A failed attempt keeps its error until pg-boss retries the job, which clears it.
export function getSegmentImportStatus(row: SegmentImportRow | undefined): CelebrityImportStatus {
  if (!row) {
    return 'notImported';
  }

  if (row.finishedAt) {
    return 'finished';
  }

  return row.error ? 'failed' : 'running';
}
