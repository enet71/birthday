# api-jobs

Background jobs for `apps/api` on [pg-boss](https://github.com/timgit/pg-boss). The jobs are rows in the `pgboss`
schema of the application database, so they survive restarts and failed ones are retried; no separate queue server is
needed.

```ts
// app.module.ts
JobsModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({ connectionString: config.getOrThrow('DATABASE_URL') }),
});

// a feature module: declare the queue and its worker on start
constructor(@Inject(PG_BOSS) private readonly boss: PgBoss) {}

await this.boss.createQueue('example', { retryLimit: 5, retryBackoff: true });
await this.boss.work<ExampleJob>('example', async ([job]) => handle(job.data));

// anywhere: queue a job
await this.boss.send('example', { id });
```

- The module starts pg-boss before the application serves requests; pg-boss creates or migrates its schema itself, not
  through the Drizzle migrations. When starting fails, the API does not start, so a deployment returns to the previous
  release.
- `createQueue` keeps an existing queue's settings; a feature module that changes them calls `updateQueue` as well.
- A job's handler must be safe to run twice: pg-boss retries a job whose worker crashed or timed out.
- Never put secrets in job data: it stays in the database after the job completes.
