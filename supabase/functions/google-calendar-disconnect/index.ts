import { withSupabase } from 'npm:@supabase/server@1';
import { forgetAndDeleteBirthdayEvents, getGoogleAccessToken, GoogleAccessRevokedError, SupabaseAdmin } from '../_shared/google-calendar.ts';
import { revokeGoogleToken } from '../_shared/google-oauth.ts';

// A push that read the connection before the disconnect may still create an event; a second pass removes it.
const SECOND_PASS_DELAY_MS = 3000;

// Stops the sync for the signed-in user and removes the birthdays Birthdly created in Google; the birthdays stay in
// Birthdly. The access is revoked even when removing them fails, so a disconnect never leaves a usable token behind.
export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const userId = ctx.userClaims?.id;

    if (!userId) {
      return Response.json({ error: 'Unknown user' }, { status: 401 });
    }

    try {
      // First, so the database trigger stops pushing birthdays while they are being removed.
      const { error: updateError } = await ctx.supabaseAdmin
        .from('google_calendar_connections')
        .update({ status: 'disconnected' })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      const { data: refreshToken, error: readError } = await ctx.supabaseAdmin.rpc('get_google_calendar_refresh_token', {
        target_user_id: userId,
      });

      if (readError) {
        throw readError;
      }
      if (refreshToken) {
        await removeBirthdayEvents(ctx.supabaseAdmin, userId);
        await revokeGoogleToken(refreshToken);
      }

      const { error: deleteError } = await ctx.supabaseAdmin.rpc('delete_google_calendar_refresh_token', { target_user_id: userId });

      if (deleteError) {
        throw deleteError;
      }

      return Response.json({ disconnected: true });
    } catch (error) {
      console.error('Disconnecting Google Calendar failed:', error);
      return Response.json({ error: 'Disconnecting failed' }, { status: 500 });
    }
  }),
};

async function removeBirthdayEvents(supabaseAdmin: SupabaseAdmin, userId: string): Promise<void> {
  try {
    const accessToken = await getGoogleAccessToken(supabaseAdmin, userId);

    await forgetAndDeleteBirthdayEvents(supabaseAdmin, userId, accessToken);
    await new Promise((resolve) => setTimeout(resolve, SECOND_PASS_DELAY_MS));
    await forgetAndDeleteBirthdayEvents(supabaseAdmin, userId, accessToken);
  } catch (error) {
    // Google no longer accepts the access, or removing failed: the birthdays stay in Google, where the user can delete
    // them, and the next connection's reconcile removes them, because no birthday points to them any more.
    if (!(error instanceof GoogleAccessRevokedError)) {
      console.error('Removing the birthdays from Google Calendar failed:', error);
    }
  }
}
