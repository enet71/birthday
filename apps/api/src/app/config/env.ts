import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // The web app's origin, for example `https://birthdly.com`. Google returns signed-in users to it, and requests that
  // change something must come from it.
  APP_ORIGIN: z
    .url({ protocol: /^https?$/ })
    .refine((value: string) => new URL(value).origin === value, { message: 'Must be an origin without a path, such as https://birthdly.com' }),
  // The OAuth client in Google Cloud Console.
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  // Encrypts the sign-in cookie. Generate it with `openssl rand -hex 32`.
  AUTH_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

// Used by `ConfigModule`, so the app stops at startup instead of failing on the first request that needs a setting.
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}
