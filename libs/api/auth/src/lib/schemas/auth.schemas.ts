import { z } from 'zod';
import { GoogleCodeSignInRequest, GoogleCredentialSignInRequest } from '@birthday/shared-models';

export const googleCodeSignInSchema = z.strictObject({ code: z.string().min(1).max(2048) }) satisfies z.ZodType<GoogleCodeSignInRequest>;

export const googleCredentialSignInSchema = z.strictObject({
  credential: z.string().min(1).max(8192),
}) satisfies z.ZodType<GoogleCredentialSignInRequest>;
