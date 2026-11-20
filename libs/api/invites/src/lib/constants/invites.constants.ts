// A guest cannot send more while the owner has this many submissions waiting.
export const MAX_PENDING_SUBMISSIONS = 50;

// Submissions from one IP address, counted separately per window.
export const SUBMISSION_THROTTLERS = [
  { name: 'minute', ttl: 60_000, limit: 5 },
  { name: 'hour', ttl: 3_600_000, limit: 20 },
];
