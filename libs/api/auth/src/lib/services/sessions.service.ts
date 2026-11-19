import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, lte, sql } from 'drizzle-orm';
import { DATABASE, Database, sessions, users } from '@birthday/api-database';
import { SESSION_EXTEND_AFTER_MS, SESSION_IDLE_MS, SESSION_MAX_MS } from '../constants';
import { ActiveSession, CreatedSession } from '../types';
import { createSessionToken, hashSessionToken } from '../utils';

// Times come from the database clock, so expiry does not depend on the API host's clock.
@Injectable()
export class SessionsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  public async create(userId: string): Promise<CreatedSession> {
    const token = createSessionToken();

    // A sign-in is a good moment to drop the user's sessions that have ended.
    await this.db.delete(sessions).where(and(eq(sessions.userId, userId), lte(sessions.expiresAt, sql`now()`)));

    const [session] = await this.db
      .insert(sessions)
      .values({
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt: sql`now() + ${interval(SESSION_IDLE_MS)}`,
        absoluteExpiresAt: sql`now() + ${interval(SESSION_MAX_MS)}`,
      })
      .returning({ expiresAt: sessions.expiresAt });

    return { token, expiresAt: session.expiresAt };
  }

  // The user of a session that has not ended, or `null`. Moves the end forward when the session was last used more
  // than a day ago.
  public async authenticate(token: string): Promise<ActiveSession | null> {
    const [row] = await this.db
      .select({
        sessionId: sessions.id,
        expiresAt: sessions.expiresAt,
        stale: sql<boolean>`${sessions.lastUsedAt} <= now() - ${interval(SESSION_EXTEND_AFTER_MS)}`,
        user: { id: users.id, email: users.email, name: users.name, picture: users.picture },
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, sql`now()`)));

    if (!row) {
      return null;
    }
    if (!row.stale) {
      return { user: row.user, expiresAt: row.expiresAt, extended: false };
    }

    const [extended] = await this.db
      .update(sessions)
      .set({
        expiresAt: sql`least(now() + ${interval(SESSION_IDLE_MS)}, ${sessions.absoluteExpiresAt})`,
        lastUsedAt: sql`now()`,
      })
      .where(eq(sessions.id, row.sessionId))
      .returning({ expiresAt: sessions.expiresAt });

    // A sign-out on another request may have removed it in between.
    return extended ? { user: row.user, expiresAt: extended.expiresAt, extended: true } : null;
  }

  public async delete(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  }
}

// The durations are constants of this module, never input, so they are written into the SQL as literals.
function interval(ms: number): ReturnType<typeof sql.raw> {
  return sql.raw(`interval '${Math.trunc(ms)} milliseconds'`);
}
