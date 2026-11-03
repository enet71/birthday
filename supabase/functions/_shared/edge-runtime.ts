// The Supabase Edge Runtime global. `waitUntil` keeps background work running after the response is sent.
declare global {
  var EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
}

export {};
