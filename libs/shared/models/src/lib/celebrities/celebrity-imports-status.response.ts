// A segment's own import step; its people's details and page views load afterwards (see the queues).
export type CelebrityImportStatus = 'notImported' | 'running' | 'finished' | 'failed';

// The pg-boss job states the admin page counts.
export const CELEBRITY_JOB_STATES = ['created', 'retry', 'active', 'completed', 'failed'] as const;
export type CelebrityJobState = (typeof CELEBRITY_JOB_STATES)[number];

export interface CelebritySegmentImportDto {
  segment: string;
  status: CelebrityImportStatus;
  // ISO timestamps.
  startedAt: string | null;
  finishedAt: string | null;
  people: number | null;
  error: string | null;
}

export interface CelebrityImportProgressDto {
  people: number;
  withDetails: number;
  withPageviews: number;
}

export interface CelebrityImportQueueDto {
  queue: string;
  counts: Record<CelebrityJobState, number>;
}

// A job that failed for good (`failed`) or will run again (`retry`).
export interface CelebrityImportFailureDto {
  queue: string;
  state: Extract<CelebrityJobState, 'failed' | 'retry'>;
  // ISO timestamp.
  at: string;
  error: string;
}

// `GET /api/admin/celebrity-imports`.
export interface CelebrityImportsStatusResponse {
  segments: CelebritySegmentImportDto[];
  progress: CelebrityImportProgressDto;
  queues: CelebrityImportQueueDto[];
  failures: CelebrityImportFailureDto[];
  // ISO timestamp.
  checkedAt: string;
}
