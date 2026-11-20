const PARALLEL_SENDS = 5;

// Runs `task` for every item, a few at a time, so one failing item does not stop the others.
export async function runInChunks<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];

  for (let start = 0; start < items.length; start += PARALLEL_SENDS) {
    results.push(...(await Promise.allSettled(items.slice(start, start + PARALLEL_SENDS).map(task))));
  }

  return results;
}
