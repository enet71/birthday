import { z } from 'zod';
import { GoogleCalendarCompleteRequest, GoogleCalendarDisconnectRequest, GoogleCalendarSyncRequest } from '@birthday/shared-models';

export const completeSchema = z.strictObject({ code: z.string().min(1).max(2048) }) satisfies z.ZodType<GoogleCalendarCompleteRequest>;

export const syncSchema = z.strictObject({ manual: z.boolean() }) satisfies z.ZodType<GoogleCalendarSyncRequest>;

// Query parameters arrive as strings. Without the parameter the events are removed, as before it existed, so an app
// version cached in a browser keeps working as it was.
export const disconnectSchema = z.strictObject({
  removeEvents: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
}) satisfies z.ZodType<GoogleCalendarDisconnectRequest, unknown>;
