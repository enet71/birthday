import '../_shared/edge-runtime.ts';
import { withSupabase } from 'npm:@supabase/server@1';
import { runGoogleSync } from '../_shared/google-import.ts';
import { exchangeGoogleCode, hasGoogleCalendarScopes, revokeGoogleToken } from '../_shared/google-oauth.ts';
import { hashNonce, readOAuthState } from '../_shared/oauth-state.ts';

// Finishes connecting after Google returned the user to the app with `code` and `state`. It requires the session
// of the user who started connecting, so a consent link sent to someone else cannot attach their Google account.
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const userId = ctx.userClaims?.id;
    const { code, state: stateValue, nonce } = await req.json().catch(() => ({}));
    const state = typeof stateValue === 'string' ? await readOAuthState(stateValue) : null;

    if (!userId || typeof code !== 'string' || typeof nonce !== 'string' || !state) {
      return Response.json({ error: 'The connect request is invalid or expired' }, { status: 400 });
    }
    if (state.userId !== userId || state.nonceHash !== (await hashNonce(nonce))) {
      return Response.json({ error: 'The connect request was started elsewhere' }, { status: 403 });
    }

    try {
      const tokens = await exchangeGoogleCode(code, state.redirectUri);

      if (!hasGoogleCalendarScopes(tokens.scope)) {
        await revokeGoogleToken(tokens.access_token);
        return Response.json({ result: 'denied' });
      }
      if (!tokens.refresh_token) {
        throw new Error('Google returned no refresh token');
      }

      const { error: tokenError } = await ctx.supabaseAdmin.rpc('set_google_calendar_refresh_token', {
        target_user_id: userId,
        refresh_token: tokens.refresh_token,
      });

      if (tokenError) {
        throw tokenError;
      }

      // No birthday points to an event after a disconnect, so there are no deletions to read yet.
      const { error: connectionError } = await ctx.supabaseAdmin
        .from('google_calendar_connections')
        .upsert(
          { user_id: userId, status: 'connected', connected_at: new Date().toISOString(), deletions_checked_at: '-infinity' },
          { onConflict: 'user_id' },
        );

      if (connectionError) {
        throw connectionError;
      }

      // Importing from Google and exporting every birthday can take a while, so it continues after the response.
      EdgeRuntime.waitUntil(
        runGoogleSync(ctx.supabaseAdmin, userId, { minIntervalMs: 0, reconcile: true })
          .then((summary) => {
            if (!summary) {
              console.warn('The first Google sync was skipped because another sync of the user is running; "Sync now" repeats it');
            }
          })
          .catch((syncError) => console.error('The first Google sync failed:', syncError)),
      );

      return Response.json({ result: 'connected' });
    } catch (error) {
      console.error('Connecting Google Calendar failed:', error);
      return Response.json({ error: 'Connecting failed' }, { status: 500 });
    }
  }),
};
