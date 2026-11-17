# api-auth

Sign-in with Google and sessions for `apps/api`.

## How signing in works

1. The web app sends the browser to `GET /api/auth/google/start?returnTo=<path>`.
2. The API creates a sign-in flow (random `state`, `nonce` and PKCE verifier), keeps it in the encrypted
   `__Host-sign-in` cookie for 10 minutes, and redirects to Google's consent page (`openid email profile`).
3. Google returns the browser to `GET /api/auth/google/callback`. openid-client checks the state, the PKCE verifier and
   the ID token (signature, issuer, audience, expiry, nonce). The email must be verified by Google.
4. The API creates or updates the user by Google's `sub`, creates a session, sets the `__Host-session` cookie and
   redirects to `returnTo`. On any failure, including a cancelled consent, it redirects to `returnTo?signIn=failed`.

`returnTo` is reduced to a path on this site, so a crafted link cannot send the user elsewhere after signing in.

## Sessions

- The cookie holds a random 256-bit token; the `sessions` table stores only its SHA-256 hash.
- `__Host-session` is HttpOnly, Secure and SameSite=Lax, so scripts cannot read it and other sites cannot send it with
  their requests.
- A session ends after 30 days without use and in any case 180 days after the sign-in. Using it moves the end forward at
  most once a day; the cookie is sent again then. Times come from the database clock.
- `POST /api/auth/sign-out` deletes the session and the cookie; it answers 204 even without a session.

## Guards

- `OriginGuard` (global): a POST, PUT, PATCH or DELETE must carry `Origin: <APP_ORIGIN>`. Browsers send it and a page
  cannot forge it, which blocks cross-site request forgery.
- `AuthGuard` (global): every endpoint needs a session unless it is marked `@Public()`. `@CurrentUser()` gives a
  controller the signed-in `AuthUser` (`{ id, email, name }`); it throws on a `@Public()` endpoint.
- `GET /api/me` returns the signed-in user.

```ts
AuthModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    googleClientId: config.getOrThrow('GOOGLE_CLIENT_ID'),
    googleClientSecret: config.getOrThrow('GOOGLE_CLIENT_SECRET'),
    appOrigin: config.getOrThrow('APP_ORIGIN'),
    secret: config.getOrThrow('AUTH_SECRET'),
  }),
});
```

## Google Cloud Console

The OAuth client must list these authorized redirect URIs:

- `https://birthdly.com/api/auth/google/callback`
- `http://localhost:4200/api/auth/google/callback` (the web dev server proxies `/api` to the API)
