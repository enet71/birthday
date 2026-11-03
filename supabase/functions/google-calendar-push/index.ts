import { withSupabase } from 'npm:@supabase/server@1';
import { BirthdayRecord, getGoogleAccessToken, GoogleAccessRevokedError, syncBirthdayEvent } from '../_shared/google-calendar.ts';

interface BirthdayChange {
  record: BirthdayRecord | null;
  old_record: BirthdayRecord | null;
}

// Mirrors one birthday change into the user's Google Calendar. Only the database trigger on `birthdays` calls it, with
// the project's secret key.
export default {
  fetch: withSupabase({ auth: 'secret' }, async (req, ctx) => {
    const change: BirthdayChange = await req.json();
    const birthday = change.record ?? change.old_record;

    if (!birthday) {
      return Response.json({ error: 'The change has no birthday' }, { status: 400 });
    }

    const { data: connection, error } = await ctx.supabaseAdmin
      .from('google_calendar_connections')
      .select('status')
      .eq('user_id', birthday.user_id)
      .maybeSingle();

    if (error) {
      console.error('Reading the Google Calendar connection failed:', error);
      return Response.json({ error: 'Push failed' }, { status: 500 });
    }
    // The user disconnected after the change was queued.
    if (connection?.status !== 'connected') {
      return Response.json({ skipped: true });
    }

    try {
      const accessToken = await getGoogleAccessToken(ctx.supabaseAdmin, birthday.user_id);

      // A deleted birthday's event id is known only from the change.
      await syncBirthdayEvent(ctx.supabaseAdmin, accessToken, birthday.id, change.old_record?.google_event_id ?? null);
      return Response.json({ pushed: true });
    } catch (pushError) {
      if (pushError instanceof GoogleAccessRevokedError) {
        return Response.json({ skipped: true });
      }

      console.error('Pushing a birthday to Google Calendar failed:', pushError);
      return Response.json({ error: 'Push failed' }, { status: 500 });
    }
  }),
};
