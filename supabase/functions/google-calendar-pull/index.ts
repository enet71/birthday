import { withSupabase } from 'npm:@supabase/server@1';
import { GoogleAccessRevokedError } from '../_shared/google-calendar.ts';
import { runGoogleSync } from '../_shared/google-import.ts';

// An automatic import runs at most once an hour across all of the user's devices; "Sync now" only skips a repeated
// click.
const AUTOMATIC_INTERVAL_MS = 60 * 60 * 1000;
const MANUAL_INTERVAL_MS = 30 * 1000;

// Imports birthdays from Google for the signed-in user. `manual` (the "Sync now" button) also makes Birthdly's
// birthdays in Google match Birthdly again, which repairs exports that failed earlier.
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const userId = ctx.userClaims?.id;
    const { manual } = await req.json().catch(() => ({}));

    if (!userId) {
      return Response.json({ error: 'Unknown user' }, { status: 401 });
    }

    try {
      const isManual = manual === true;
      const summary = await runGoogleSync(ctx.supabaseAdmin, userId, {
        minIntervalMs: isManual ? MANUAL_INTERVAL_MS : AUTOMATIC_INTERVAL_MS,
        reconcile: isManual,
      });

      return Response.json(summary ? { skipped: false, ...summary } : { skipped: true });
    } catch (error) {
      if (error instanceof GoogleAccessRevokedError) {
        return Response.json({ skipped: true, revoked: true });
      }

      console.error('Importing from Google failed:', error);
      return Response.json({ error: 'Sync failed' }, { status: 500 });
    }
  }),
};
