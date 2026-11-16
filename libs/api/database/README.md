# api-database

Postgres access for `apps/api`: the Drizzle schema and `DatabaseModule`, which provides a typed Drizzle client.

## Usage

```ts
// app.module.ts
DatabaseModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({ connectionString: config.getOrThrow('DATABASE_URL') }),
});

// any provider
constructor(@Inject(DATABASE) private readonly db: Database) {}

const rows = await this.db.select().from(birthdays).where(eq(birthdays.userId, userId));
```

## Who owns the schema

Until the database moves off Supabase (migration step 5), **`supabase/migrations` is the source of truth**.

- Change the database with a Supabase migration first, then update the matching file in `src/lib/schema` by hand.
- The Drizzle schema describes the `public` tables, their keys, indexes and checks. It does not describe RLS policies,
  grants, triggers or SQL functions; they stay in the Supabase migrations.
- Never run `drizzle-kit generate`, `migrate` or `push` against the Supabase database.

At step 5 Drizzle becomes the owner: a baseline migration is generated from this schema, and `auth.users` is replaced
with an own `users` table.

## drizzle-kit

Run from the workspace root. The config reads `DATABASE_URL` from `apps/api/.env`.

```bash
# Browse the data
npx drizzle-kit studio --config libs/api/database/drizzle.config.ts

# Introspect the live database into tmp/drizzle to compare it with src/lib/schema
npx drizzle-kit pull --config libs/api/database/drizzle.config.ts
```
