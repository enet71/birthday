import { withSupabase } from 'npm:@supabase/server@1';
import { buildGoogleConsentUrl } from '../_shared/google-oauth.ts';
import { createOAuthState, isAllowedRedirectUri } from '../_shared/oauth-state.ts';

// Returns the Google consent URL for the signed-in user. Google returns the browser to `redirectUri` in the app,
// which then calls `google-calendar-complete`.
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const userId = ctx.userClaims?.id;
    const { redirectUri, nonce } = await req.json().catch(() => ({}));

    if (!userId) {
      return Response.json({ error: 'Unknown user' }, { status: 401 });
    }
    if (!isAllowedRedirectUri(redirectUri)) {
      return Response.json({ error: 'The redirect URI is not allowed' }, { status: 400 });
    }
    if (typeof nonce !== 'string' || nonce.length < 32) {
      return Response.json({ error: 'The nonce is missing' }, { status: 400 });
    }

    const state = await createOAuthState(userId, redirectUri, nonce);

    return Response.json({ url: buildGoogleConsentUrl(redirectUri, state, ctx.userClaims?.email) });
  }),
};
