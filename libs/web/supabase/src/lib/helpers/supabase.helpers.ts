import { defer, map, Observable } from 'rxjs';

// Runs a Supabase request on subscribe and fails the Observable on `error`, so it emits only the success response.
export function fromSupabase<R extends { error: unknown }>(request: () => PromiseLike<R>): Observable<Extract<R, { error: null }>> {
  return defer(request).pipe(
    map((response: R) => {
      if (response.error) {
        throw response.error;
      }

      return response as Extract<R, { error: null }>;
    }),
  );
}
