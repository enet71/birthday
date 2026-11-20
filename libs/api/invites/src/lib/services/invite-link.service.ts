import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { InviteLinkDto, PublicInviteDto, SaveInviteLinkRequest } from '@birthday/shared-models';
import { DATABASE, Database, inviteLinks } from '@birthday/api-database';

const LINK_COLUMNS = {
  token: inviteLinks.token,
  displayName: inviteLinks.displayName,
  enabled: inviteLinks.enabled,
};

// 128 random bits in base64url, so links cannot be guessed.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

@Injectable()
export class InviteLinkService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  public async get(userId: string): Promise<InviteLinkDto | null> {
    const [link] = await this.db.select(LINK_COLUMNS).from(inviteLinks).where(eq(inviteLinks.userId, userId));

    return link ?? null;
  }

  // The token is made only when the link is created; saving again keeps it.
  public async save(userId: string, request: SaveInviteLinkRequest): Promise<InviteLinkDto> {
    const [link] = await this.db
      .insert(inviteLinks)
      .values({ userId, token: createToken(), displayName: request.displayName, enabled: request.enabled })
      .onConflictDoUpdate({ target: inviteLinks.userId, set: { displayName: request.displayName, enabled: request.enabled } })
      .returning(LINK_COLUMNS);

    return link;
  }

  public async reissue(userId: string): Promise<InviteLinkDto> {
    const [link] = await this.db.update(inviteLinks).set({ token: createToken() }).where(eq(inviteLinks.userId, userId)).returning(LINK_COLUMNS);

    if (!link) {
      throw new NotFoundException();
    }
    return link;
  }

  public async getPublic(token: string): Promise<PublicInviteDto> {
    const { displayName } = await this.findEnabled(token);

    return { displayName };
  }

  // A disabled, reissued, or unknown link answers 404 alike.
  public async findEnabled(token: string): Promise<{ userId: string; displayName: string }> {
    const [link] = TOKEN_PATTERN.test(token)
      ? await this.db
          .select({ userId: inviteLinks.userId, displayName: inviteLinks.displayName })
          .from(inviteLinks)
          .where(and(eq(inviteLinks.token, token), eq(inviteLinks.enabled, true)))
      : [];

    if (!link) {
      throw new NotFoundException();
    }
    return link;
  }
}

function createToken(): string {
  return randomBytes(16).toString('base64url');
}
