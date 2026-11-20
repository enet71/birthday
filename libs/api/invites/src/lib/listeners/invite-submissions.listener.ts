import { CreatedInviteSubmission } from '../types';

// Hears about every submission a guest sends, for example to notify the link owner. Another module provides it. The
// guest's request does not wait for it, so it must handle its own errors and never reject.
export abstract class InviteSubmissionsListener {
  public abstract submissionCreated(submission: CreatedInviteSubmission): Promise<void>;
}
