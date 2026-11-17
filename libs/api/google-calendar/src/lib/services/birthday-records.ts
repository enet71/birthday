import { and, asc, eq, gt, SQL, sql } from 'drizzle-orm';
import { birthdays, Database } from '@birthday/api-database';
import { BirthdayRecord } from '../types';

const PAGE_SIZE = 1000;

const BIRTHDAY_RECORD_COLUMNS = {
  id: birthdays.id,
  userId: birthdays.userId,
  name: birthdays.name,
  birthDate: birthdays.birthDate,
  googleContactId: birthdays.googleContactId,
  googleContactSnapshot: birthdays.googleContactSnapshot,
  googleEventId: birthdays.googleEventId,
  updatedAt: sql<string>`${birthdays.updatedAt}::text`,
  updatedAtMs: sql<number>`extract(epoch from ${birthdays.updatedAt}) * 1000`.mapWith(Number),
};

export async function findBirthdayRecord(db: Database, userId: string, id: string): Promise<BirthdayRecord | undefined> {
  const [record] = await db
    .select(BIRTHDAY_RECORD_COLUMNS)
    .from(birthdays)
    .where(and(eq(birthdays.id, id), eq(birthdays.userId, userId)));

  return record;
}

// All of the user's birthdays, in keyset pages: a row deleted meanwhile cannot shift the next page and skip one.
export async function readBirthdayRecords(db: Database, userId: string): Promise<BirthdayRecord[]> {
  const records: BirthdayRecord[] = [];

  while (true) {
    const lastId = records.at(-1)?.id;
    const page = await db
      .select(BIRTHDAY_RECORD_COLUMNS)
      .from(birthdays)
      .where(and(eq(birthdays.userId, userId), lastId ? gt(birthdays.id, lastId) : undefined))
      .orderBy(asc(birthdays.id))
      .limit(PAGE_SIZE);

    records.push(...page);
    if (page.length < PAGE_SIZE) {
      return records;
    }
  }
}

// Matches the row only while nobody changed it since it was read as `updatedAt`.
export function isUnchangedSince(updatedAt: string): SQL {
  return sql`${birthdays.updatedAt} = ${updatedAt}::timestamptz`;
}
