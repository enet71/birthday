import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../schema';

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseModuleOptions {
  connectionString: string;
  // The folder with the generated migrations. They are applied when the application starts, before it serves requests.
  migrationsFolder: string;
}
