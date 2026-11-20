import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import { BirthdayDto, CreateInviteSubmissionRequest, InviteSubmissionDto } from '@birthday/shared-models';
import { DATABASE, Database, inviteSubmissions } from '@birthday/api-database';
import { BirthdaysService } from '@birthday/api-birthdays';
import { MAX_PENDING_SUBMISSIONS } from '../constants';
import { InviteLinkService } from './invite-link.service';

const SUBMISSION_COLUMNS = {
  id: inviteSubmissions.id,
  name: inviteSubmissions.name,
  birthDate: inviteSubmissions.birthDate,
  createdAt: inviteSubmissions.createdAt,
};

// Every owner query is limited to the signed-in user's rows, as in `BirthdaysService`.
@Injectable()
export class InviteSubmissionsService {
  private readonly logger = new Logger(InviteSubmissionsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly inviteLinkService: InviteLinkService,
    private readonly birthdaysService: BirthdaysService,
  ) {}

  // A filled honeypot gets the same answer as a real submission, so a bot does not learn it was dropped. Two guests
  // sending at once may pass the limit by one; it only guards against floods.
  public async create(token: string, request: CreateInviteSubmissionRequest): Promise<void> {
    const { userId } = await this.inviteLinkService.findEnabled(token);

    if (request.website) {
      return;
    }

    const [{ pending }] = await this.db.select({ pending: count() }).from(inviteSubmissions).where(eq(inviteSubmissions.userId, userId));

    if (pending >= MAX_PENDING_SUBMISSIONS) {
      throw new ConflictException('The link owner has too many pending submissions');
    }
    await this.db.insert(inviteSubmissions).values({ userId, name: request.name, birthDate: request.birthDate });
  }

  public async list(userId: string): Promise<InviteSubmissionDto[]> {
    const submissions = await this.db
      .select(SUBMISSION_COLUMNS)
      .from(inviteSubmissions)
      .where(eq(inviteSubmissions.userId, userId))
      .orderBy(asc(inviteSubmissions.createdAt));

    return submissions.map((submission) => ({ ...submission, createdAt: submission.createdAt.toISOString() }));
  }

  // Deleting first claims the submission, so approving it twice at once adds one birthday. If adding fails, the
  // submission is put back for another try, and the error of adding is the one reported.
  public async approve(userId: string, id: string): Promise<BirthdayDto> {
    const [submission] = await this.db
      .delete(inviteSubmissions)
      .where(and(eq(inviteSubmissions.id, id), eq(inviteSubmissions.userId, userId)))
      .returning();

    if (!submission) {
      throw new NotFoundException();
    }

    try {
      return await this.birthdaysService.create(userId, {
        name: submission.name,
        birthDate: submission.birthDate,
        relationship: null,
        notes: null,
      });
    } catch (error) {
      await this.db
        .insert(inviteSubmissions)
        .values(submission)
        .onConflictDoNothing()
        .catch((restoreError: unknown) => this.logger.error({ err: restoreError, submissionId: id }, 'Could not restore an invite submission'));
      throw error;
    }
  }

  // Rejecting a submission that is already gone succeeds, as deleting a birthday does.
  public async reject(userId: string, id: string): Promise<void> {
    await this.db.delete(inviteSubmissions).where(and(eq(inviteSubmissions.id, id), eq(inviteSubmissions.userId, userId)));
  }
}
