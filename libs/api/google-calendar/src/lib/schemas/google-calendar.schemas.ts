import { z } from 'zod';
import { GoogleCalendarCompleteRequest, GoogleCalendarConnectRequest, GoogleCalendarSyncRequest } from '@birthday/shared-models';

const nonce = z.string().min(32).max(256);

export const connectSchema = z.strictObject({
  redirectUri: z.url({ protocol: /^https?$/ }).max(2048),
  nonce,
}) satisfies z.ZodType<GoogleCalendarConnectRequest>;

export const completeSchema = z.strictObject({
  code: z.string().min(1).max(2048),
  state: z.string().min(1).max(4096),
  nonce,
}) satisfies z.ZodType<GoogleCalendarCompleteRequest>;

export const syncSchema = z.strictObject({ manual: z.boolean() }) satisfies z.ZodType<GoogleCalendarSyncRequest>;
