import {
  BIRTHDAY_COLUMNS,
  BirthdayRecord,
  callGoogleApi,
  getGoogleAccessToken,
  isConnected,
  listBirthdayEvents,
  reconcileBirthdayEvents,
  saveEventId,
  SupabaseAdmin,
  syncBirthdayEvent,
  UNKNOWN_BIRTH_YEAR,
} from './google-calendar.ts';

export interface ImportSummary {
  added: number;
  updated: number;
  deleted: number;
}

interface ContactBirthday {
  // The People API resource name, stored in `birthdays.google_contact_id`.
  contactId: string;
  name: string;
  birthDate: string;
  // When Google last changed the source the birthday came from.
  updatedAt: number;
}

const PEOPLE_CONNECTIONS_URL = 'https://people.googleapis.com/v1/people/me/connections';
// The database limit for a birthday name.
const MAX_NAME_LENGTH = 200;
// A crashed sync releases the user after this long.
const SYNC_LEASE_MS = 10 * 60 * 1000;
const UNIQUE_VIOLATION = '23505';
// Deleted events show up only among events updated since a given time; this margin covers clock differences.
const DELETION_LOOKBACK_MS = 24 * 60 * 60 * 1000;

// Runs `syncWithGoogle` unless another sync of the user is running or the last one started less than `minIntervalMs`
// ago. Returns `null` when it did not run.
export async function runGoogleSync(
  supabaseAdmin: SupabaseAdmin,
  userId: string,
  options: { minIntervalMs: number; reconcile: boolean },
): Promise<ImportSummary | null> {
  const now = Date.now();
  const { data: claimed, error } = await supabaseAdmin
    .from('google_calendar_connections')
    .update({ last_pulled_at: new Date(now).toISOString(), sync_running_until: new Date(now + SYNC_LEASE_MS).toISOString() })
    .eq('user_id', userId)
    .eq('status', 'connected')
    .lt('sync_running_until', new Date(now).toISOString())
    .lte('last_pulled_at', new Date(now - options.minIntervalMs).toISOString())
    .select('user_id');

  if (error) {
    throw error;
  }
  if (claimed.length === 0) {
    return null;
  }

  try {
    return await syncWithGoogle(supabaseAdmin, userId, options.reconcile, now);
  } finally {
    const { error: releaseError } = await supabaseAdmin
      .from('google_calendar_connections')
      .update({ sync_running_until: '-infinity' })
      .eq('user_id', userId);

    if (releaseError) {
      console.error('Releasing the Google sync lease failed; the next sync waits for it to expire:', releaseError);
    }
  }
}

// Imports from Google, then makes Birthdly's birthdays in Google match Birthdly when `reconcile` is set. Sets
// `last_synced_at` on success. `startedAt` is when this sync claimed the user.
async function syncWithGoogle(supabaseAdmin: SupabaseAdmin, userId: string, reconcile: boolean, startedAt: number): Promise<ImportSummary> {
  const accessToken = await getGoogleAccessToken(supabaseAdmin, userId);
  const summary: ImportSummary = { added: 0, updated: 0, deleted: 0 };

  await importContactBirthdays(supabaseAdmin, userId, await listContactBirthdays(accessToken), summary);
  await importDeletedBirthdayEvents(supabaseAdmin, userId, accessToken, startedAt, summary);

  if (reconcile) {
    await reconcileBirthdayEvents(supabaseAdmin, userId, accessToken);
    return summary;
  }

  const { error } = await supabaseAdmin
    .from('google_calendar_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
  return summary;
}

// Brings in the birthdays of the user's Google contacts. A contact's birthday is applied only when it changed in
// Google since the last import and that change is later than the last edit in Birthdly. Birthdly never changes
// contacts.
async function importContactBirthdays(
  supabaseAdmin: SupabaseAdmin,
  userId: string,
  contacts: ContactBirthday[],
  summary: ImportSummary,
): Promise<void> {
  const birthdays = await readBirthdays(supabaseAdmin, userId);
  const contactIds = new Set(contacts.map((contact) => contact.contactId));

  // The birthday is gone from Google Contacts: Birthdly keeps it and starts exporting it to Google Calendar. This comes
  // first, so a contact recreated with a new id links to it instead of adding the person twice.
  for (const birthday of birthdays) {
    if (birthday.google_contact_id && !contactIds.has(birthday.google_contact_id)) {
      await updateBirthday(supabaseAdmin, birthday.id, { google_contact_id: null, google_contact_snapshot: null });
      birthday.google_contact_id = null;
      birthday.google_contact_snapshot = null;
    }
  }

  const byContactId = new Map(birthdays.filter((birthday) => birthday.google_contact_id).map((birthday) => [birthday.google_contact_id, birthday]));

  for (const contact of contacts) {
    const linked = byContactId.get(contact.contactId);
    const snapshot = toSnapshot(contact);

    if (linked) {
      if (linked.google_contact_snapshot === snapshot) {
        continue;
      }

      // Without a later change in Google, only the snapshot moves on, and the edit made in Birthdly stays.
      if (contact.updatedAt <= Date.parse(linked.updated_at)) {
        await updateBirthday(supabaseAdmin, linked.id, { google_contact_snapshot: snapshot });
        continue;
      }

      const birthDate = keepKnownYear(linked.birth_date, contact.birthDate);
      const isChanged = contact.name !== linked.name || birthDate !== linked.birth_date;
      const isApplied = await updateBirthday(
        supabaseAdmin,
        linked.id,
        { name: contact.name, birth_date: birthDate, google_contact_snapshot: snapshot },
        linked.updated_at,
      );

      if (isApplied && isChanged) {
        summary.updated++;
      }
      continue;
    }

    // The same person added in both places is linked instead of being added twice.
    const match = birthdays.find((birthday) => !birthday.google_contact_id && isSamePerson(birthday, contact.name, contact.birthDate));

    if (match) {
      match.google_contact_id = contact.contactId;
      await ignoreDuplicate(updateBirthday(supabaseAdmin, match.id, { google_contact_id: contact.contactId, google_contact_snapshot: snapshot }));
      continue;
    }

    // An overlapping run may have imported the contact already; then nothing is inserted.
    const { data: inserted, error } = await supabaseAdmin
      .from('birthdays')
      .upsert(
        {
          user_id: userId,
          name: contact.name,
          birth_date: contact.birthDate,
          google_contact_id: contact.contactId,
          google_contact_snapshot: snapshot,
        },
        { onConflict: 'user_id,google_contact_id', ignoreDuplicates: true },
      )
      .select('id');

    if (error) {
      throw error;
    }
    summary.added += inserted.length;
  }
}

async function listContactBirthdays(accessToken: string): Promise<ContactBirthday[]> {
  const contacts: ContactBirthday[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ personFields: 'names,birthdays,metadata', pageSize: '1000', ...(pageToken ? { pageToken } : {}) });
    const page = await callGoogleApi(accessToken, 'GET', `${PEOPLE_CONNECTIONS_URL}?${params}`);

    for (const person of page.connections ?? []) {
      const contact = toContactBirthday(person);

      if (contact) {
        contacts.push(contact);
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return contacts;
}

// deno-lint-ignore no-explicit-any
function toContactBirthday(person: any): ContactBirthday | null {
  // deno-lint-ignore no-explicit-any
  const pickPrimary = (items: any[] | undefined) => items?.find((item) => item.metadata?.primary) ?? items?.[0];
  const name = pickPrimary(person.names)?.displayName?.trim().slice(0, MAX_NAME_LENGTH);
  const birthday = pickPrimary(person.birthdays?.filter((item: { date?: unknown }) => item.date));
  const date = birthday?.date;

  if (!name || !date?.month || !date?.day) {
    return null;
  }

  // Only the source of the birthday counts: a profile photo or a phone number changing must not undo a Birthdly edit.
  const source = (person.metadata?.sources ?? []).find(
    (item: { type?: string; id?: string }) => item.type === birthday.metadata?.source?.type && item.id === birthday.metadata?.source?.id,
  );
  const updatedAt = Date.parse(source?.updateTime);

  return {
    contactId: person.resourceName,
    name,
    birthDate: toValidBirthDate(date.year ? String(date.year).padStart(4, '0') : UNKNOWN_BIRTH_YEAR, pad(date.month), pad(date.day)),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
  };
}

// Brings in deletions the user made to Birthdly's birthdays in Google; Google allows no other change to birthday
// events. Deleted events are listed only among events updated since a given time, so the read starts a little before
// the time up to which deletions were read last. That time moves to `startedAt` only when all of them were handled. A
// deleted event is handled once: afterwards no birthday points to its id any more. One failing event does not stop
// the others; the import still fails at the end, so `last_synced_at` stays.
async function importDeletedBirthdayEvents(
  supabaseAdmin: SupabaseAdmin,
  userId: string,
  accessToken: string,
  startedAt: number,
  summary: ImportSummary,
): Promise<void> {
  const { data: connection, error: connectionError } = await supabaseAdmin
    .from('google_calendar_connections')
    .select('deletions_checked_at')
    .eq('user_id', userId)
    .single();

  if (connectionError) {
    throw connectionError;
  }

  // `-infinity` (right after connecting, when no birthday points to an event yet) parses to NaN.
  const checkedAt = Date.parse(connection.deletions_checked_at);

  if (Number.isFinite(checkedAt)) {
    await importDeletions(supabaseAdmin, userId, accessToken, checkedAt, summary);
  }

  const { error } = await supabaseAdmin
    .from('google_calendar_connections')
    .update({ deletions_checked_at: new Date(startedAt).toISOString() })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

async function importDeletions(
  supabaseAdmin: SupabaseAdmin,
  userId: string,
  accessToken: string,
  checkedAt: number,
  summary: ImportSummary,
): Promise<void> {
  const events = await listBirthdayEvents(accessToken, new Date(checkedAt - DELETION_LOOKBACK_MS));

  // Google keeps deleted events only for a while; older ones can no longer be read, so they are given up.
  if (events === null) {
    console.warn('Google no longer lists deletions this old; they are skipped');
    return;
  }

  const birthdays = await readBirthdays(supabaseAdmin, userId);
  const byEventId = new Map(birthdays.filter((birthday) => birthday.google_event_id).map((birthday) => [birthday.google_event_id, birthday]));
  const errors: unknown[] = [];

  for (const event of events) {
    const birthday = byEventId.get(event.id);

    // A linked birthday has no event of Birthdly's; one left over is removed by the push of the link.
    if (event.status !== 'cancelled' || event.recurringEventId || !birthday || birthday.google_contact_id) {
      continue;
    }

    try {
      await importEventDeletion(supabaseAdmin, accessToken, event, birthday, checkedAt, summary);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, `${errors.length} Google birthday deletions could not be imported`);
  }
}

// The user deleted the birthday's event in Google. Without `updated`, the deletion is known only to be later than
// `checkedAt`, up to which deletions were read before. If Birthdly changed the birthday later, the birthday stays and gets
// a new event. Either way no birthday points to the deleted id afterwards, so the deletion is handled once.
async function importEventDeletion(
  supabaseAdmin: SupabaseAdmin,
  accessToken: string,
  // deno-lint-ignore no-explicit-any
  event: any,
  birthday: BirthdayRecord,
  checkedAt: number,
  summary: ImportSummary,
): Promise<void> {
  // Birthdly deletes events itself only after forgetting their ids (disconnect) or replacing them, so a deletion
  // counts only while the user is connected and the birthday still points to the event.
  const { data: current, error } = await supabaseAdmin.from('birthdays').select('google_event_id').eq('id', birthday.id).maybeSingle();

  if (error) {
    throw error;
  }
  if (current?.google_event_id !== event.id || !(await isConnected(supabaseAdmin, birthday.user_id))) {
    return;
  }

  const eventUpdatedAt = Date.parse(event.updated);
  const birthdayUpdatedAt = Date.parse(birthday.updated_at);
  const isGoogleLater = Number.isFinite(eventUpdatedAt) ? eventUpdatedAt > birthdayUpdatedAt : birthdayUpdatedAt <= checkedAt;

  if (isGoogleLater && (await deleteBirthday(supabaseAdmin, birthday.id, birthday.updated_at))) {
    summary.deleted++;
    return;
  }
  // Forgotten first, so a failed re-creation cannot turn into a deletion on the next sync.
  if (await saveEventId(supabaseAdmin, { ...birthday, google_event_id: event.id }, null)) {
    await syncBirthdayEvent(supabaseAdmin, accessToken, birthday.id);
  }
}

async function readBirthdays(supabaseAdmin: SupabaseAdmin, userId: string): Promise<BirthdayRecord[]> {
  const birthdays: BirthdayRecord[] = [];

  while (true) {
    const query = supabaseAdmin.from('birthdays').select(BIRTHDAY_COLUMNS).eq('user_id', userId).order('id').limit(1000);
    const { data, error } = await (birthdays.length > 0 ? query.gt('id', birthdays[birthdays.length - 1].id) : query);

    if (error) {
      throw error;
    }
    birthdays.push(...data);
    if (data.length < 1000) {
      return birthdays;
    }
  }
}

// With `expectedUpdatedAt`, writes only if nobody changed the birthday since it was read, for example in the web app
// during this sync. Returns whether a row was written.
async function updateBirthday(
  supabaseAdmin: SupabaseAdmin,
  id: string,
  changes: Partial<Pick<BirthdayRecord, 'name' | 'birth_date' | 'google_contact_id' | 'google_contact_snapshot'>>,
  expectedUpdatedAt?: string,
): Promise<boolean> {
  const query = supabaseAdmin.from('birthdays').update(changes).eq('id', id);
  const { data, error } = await (expectedUpdatedAt ? query.eq('updated_at', expectedUpdatedAt) : query).select('id');

  if (error) {
    throw error;
  }
  return data.length > 0;
}

async function deleteBirthday(supabaseAdmin: SupabaseAdmin, id: string, expectedUpdatedAt: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('birthdays').delete().eq('id', id).eq('updated_at', expectedUpdatedAt).select('id');

  if (error) {
    throw error;
  }
  return data.length > 0;
}

// An overlapping run linked the contact to another birthday first; that link stays.
async function ignoreDuplicate(write: Promise<boolean>): Promise<void> {
  try {
    await write;
  } catch (error) {
    if ((error as { code?: string }).code !== UNIQUE_VIOLATION) {
      throw error;
    }
  }
}

function isSamePerson(birthday: BirthdayRecord, name: string, birthDate: string): boolean {
  const [birthdayYear, ...birthdayMonthDay] = birthday.birth_date.split('-');
  const [otherYear, ...otherMonthDay] = birthDate.split('-');
  const isYearCompatible = birthdayYear === otherYear || birthdayYear === UNKNOWN_BIRTH_YEAR || otherYear === UNKNOWN_BIRTH_YEAR;

  return normalizeName(birthday.name) === normalizeName(name) && birthdayMonthDay.join('-') === otherMonthDay.join('-') && isYearCompatible;
}

// A contact without a birth year does not erase a year known in Birthdly.
function keepKnownYear(current: string, imported: string): string {
  const [importedYear, month, day] = imported.split('-');

  return importedYear === UNKNOWN_BIRTH_YEAR && !current.startsWith(UNKNOWN_BIRTH_YEAR)
    ? toValidBirthDate(current.slice(0, 4), month, day)
    : imported;
}

// Feb 29 with a non-leap year, for example a known year combined with a year-less Feb 29 from Google, keeps the day
// and drops the year instead of failing the whole sync.
function toValidBirthDate(year: string, month: string, day: string): string {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  date.setUTCFullYear(Number(year));
  return date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)
    ? `${year}-${month}-${day}`
    : `${UNKNOWN_BIRTH_YEAR}-${month}-${day}`;
}

function toSnapshot(contact: ContactBirthday): string {
  return `${contact.birthDate}|${contact.name}`;
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
