import { pgSchema, uuid } from 'drizzle-orm/pg-core';

// Supabase Auth owns `auth.users`; only the key the tables reference is described. Step 5 replaces it with an own
// `users` table.
export const authUsers = pgSchema('auth').table('users', {
  id: uuid('id').primaryKey(),
});
