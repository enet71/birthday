# api-auth

Sign-in with Google and sessions for `apps/api`.

## How signing in works

The web app signs in with Google Identity Services in the browser and hands the result to the API:

1. `GET /api/auth/google/config` returns `{ clientId, nonce }`. The nonce is kept in the encrypted `__Host-sign-in`
   cookie for 10 minutes; while that cookie is valid the same nonce is returned, so tabs of one browser share it.
2. One of two endpoints signs the user in:
   - `POST /api/auth/google/code { code }`: the authorization code from the sign-in popup. The API exchanges it with
     the client secret (`redirect_uri=postmessage`) for an ID token.
   - `POST /api/auth/google/credential { credential }`: the ID token from One Tap. It must carry the nonce from the
     cookie, so a token issued for another browser is rejected; the cookie is cleared after use.
3. The ID token is checked with Google's keys (signature, issuer, audience = client id, expiry). The email must be
   verified by Google.
4. The API creates or updates the user by Google's `sub`, creates a session and answers 204 with the `__Host-session`
   cookie. An invalid code or token answers 401, an invalid body 400.

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

The OAuth client must list these authorized JavaScript origins:

- `https://birthdly.com`
- `http://localhost:4200` (the web dev server proxies `/api` to the API, or to production with `web:serve-prod-api`)
