import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs from the workspace root and reads the API's local settings.
const ENV_FILE = 'apps/api/.env';

if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

export default defineConfig({
  dialect: 'postgresql',
  // The barrel, not the folder: the folder also holds specs, which drizzle-kit must not load.
  schema: './libs/api/database/src/lib/schema/index.ts',
  // The API applies these on start; see README.md.
  out: './libs/api/database/migrations',
  schemaFilter: ['public'],
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  strict: true,
  verbose: true,
});
