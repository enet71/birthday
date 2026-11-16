import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs from the workspace root and reads the API's local settings.
const ENV_FILE = 'apps/api/.env';

if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './libs/api/database/src/lib/schema',
  // `pull` writes here; the folder is ignored by Git.
  out: './tmp/drizzle',
  schemaFilter: ['public'],
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
});
