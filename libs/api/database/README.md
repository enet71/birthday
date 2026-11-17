# api-database

Postgres access for `apps/api`: the Drizzle schema, the migrations, and `DatabaseModule`, which provides a typed
Drizzle client and applies the migrations when the API starts.

## Usage

```ts
// app.module.ts
DatabaseModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connectionString: config.getOrThrow('DATABASE_URL'),
    migrationsFolder: join(__dirname, 'migrations'),
  }),
});

// any provider
constructor(@Inject(DATABASE) private readonly db: Database) {}

const rows = await this.db.select().from(birthdays).where(eq(birthdays.userId, userId));
```

There is no row-level security: the API connects as the database owner, so every query must filter by the signed-in
user itself.

## Schema and migrations

`src/lib/schema` is the source of truth. `migrations/` holds the SQL that brings a database to it; Drizzle records the
applied ones in `drizzle.__drizzle_migrations`. The API applies the missing ones on start, before it serves requests
(`DatabaseModule.onApplicationBootstrap`); a failing migration stops the start, so a deployment does not become healthy
and returns to the previous release.

To change the database:

1. Change the schema in `src/lib/schema`.
2. Generate the migration from the workspace root, with a short name:
   ```bash
   npx drizzle-kit generate --config libs/api/database/drizzle.config.ts --name add-birthday-photo
   ```
3. Read the generated SQL, commit it with the schema change, and restart the API to apply it locally.

Rules:

- Never edit or delete a migration that was deployed; fix it with a new one.
- After rebasing onto `main`, delete your unmerged migration (the SQL file, its snapshot and its journal entry) and
  generate it again. Drizzle applies only migrations newer than the newest applied one, so a migration that is older
  than one already deployed would be skipped without an error. CI fails when the journal is out of order or when the
  schema has changes without a migration.
- Keep migrations backward compatible: the previous release must still work with the new schema, because a rollback
  returns to the previous image but not to the previous schema. Add a column as nullable or with a default, and drop
  or rename one only in a later release, once no running code uses it.
- What Drizzle cannot express (functions, for example) goes into a custom migration:
  `npx drizzle-kit generate --config libs/api/database/drizzle.config.ts --custom --name <name>`.

## Local database

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres 17 on localhost:5432, see apps/api/.env.example

# Browse the data
npx drizzle-kit studio --config libs/api/database/drizzle.config.ts
```

The drizzle-kit config reads `DATABASE_URL` from `apps/api/.env`.
