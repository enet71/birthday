// What the web app needs to start a Google sign-in, as `GET /api/auth/google/config` returns it. `nonce` ties a One Tap
// ID token to this browser; the API remembers it in a cookie.
export interface GoogleSignInConfigDto {
  clientId: string;
  nonce: string;
}
