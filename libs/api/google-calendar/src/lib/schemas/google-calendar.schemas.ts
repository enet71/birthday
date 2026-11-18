import { z } from 'zod';
import { GoogleCalendarCompleteRequest, GoogleCalendarSyncRequest } from '@birthday/shared-models';

export const completeSchema = z.strictObject({ code: z.string().min(1).max(2048) }) satisfies z.ZodType<GoogleCalendarCompleteRequest>;

export const syncSchema = z.strictObject({ manual: z.boolean() }) satisfies z.ZodType<GoogleCalendarSyncRequest>;
