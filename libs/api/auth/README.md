# api-auth

Authentication for `apps/api`. Until the own auth replaces it (migration step 6), the API accepts the access tokens
that Supabase Auth issues to the web app.

- `AuthGuard` runs for every endpoint (`APP_GUARD`). It reads `Authorization: Bearer <token>` and verifies the token
  against the project's public keys (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`, ES256): the signature, `iss`,
  `aud: authenticated`, `exp`, and `role: authenticated`. It answers 401 without telling why; the reason is logged at
  the `debug` level. When the keys cannot be loaded from Supabase it answers 503, so the web app does not take an outage
  for a sign-out.
- The keys are cached for 10 minutes and fetched again for a token signed with an unknown key: a key rotation needs no
  restart, and a key Supabase revokes stops working within 10 minutes. When a refresh fails, the keys loaded last keep
  verifying tokens (`supabase-key-set.ts`).
- `@Public()` lets an endpoint skip the check, for example the health check.
- `@CurrentUser()` gives a controller the signed-in `AuthUser` (`{ id, email }`). It throws on a `@Public()` endpoint,
  which has no user.
- `GET /api/me` returns the signed-in user.

```ts
AuthModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({ supabaseUrl: config.getOrThrow('SUPABASE_URL') }),
});
```
