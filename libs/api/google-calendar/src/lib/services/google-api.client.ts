import { Injectable } from '@nestjs/common';

const RETRY_DELAYS_MS = [1000, 3000];
// A hanging Google request must not hold a sync or a job forever.
const REQUEST_TIMEOUT_MS = 30 * 1000;

// Calls the Calendar and People APIs with the user's access token.
@Injectable()
export class GoogleApiClient {
  // Returns the JSON body, an empty object for an empty response, or `null` for one of `allowedStatuses`. Retries rate
  // limits and server errors a few times.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async request(accessToken: string, method: string, url: string, body?: unknown, allowedStatuses: number[] = []): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (allowedStatuses.includes(response.status)) {
        await response.body?.cancel();
        return null;
      }

      const text = await response.text();

      if (response.ok) {
        return text ? JSON.parse(text) : {};
      }

      const isRetryable = response.status === 429 || response.status >= 500 || (response.status === 403 && /rateLimitExceeded/i.test(text));

      if (!isRetryable || attempt >= RETRY_DELAYS_MS.length) {
        throw new Error(`Google API ${method} ${url} failed: ${response.status} ${text}`);
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}
