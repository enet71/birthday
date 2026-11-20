import { CelebrityImportStatus, CelebrityJobState } from '@birthday/shared-models';

export const ADMIN_IMPORTS_REFRESH_MS = 10_000;

// The admin pages are English only.
export const ADMIN_IMPORT_STATUS_LABELS: Record<CelebrityImportStatus, string> = {
  notImported: 'Not imported',
  running: 'Running',
  finished: 'Finished',
  failed: 'Failed',
};

export const ADMIN_JOB_STATE_COLUMNS: { state: CelebrityJobState; label: string }[] = [
  { state: 'created', label: 'Waiting' },
  { state: 'active', label: 'Active' },
  { state: 'retry', label: 'Retry' },
  { state: 'failed', label: 'Failed' },
  { state: 'completed', label: 'Completed' },
];

export const ADMIN_DATE_FORMAT = 'yyyy-MM-dd HH:mm:ss';
