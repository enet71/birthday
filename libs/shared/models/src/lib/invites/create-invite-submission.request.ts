import { InviteSubmissionDto } from './invite-submission.dto';

export interface CreateInviteSubmissionRequest extends Pick<InviteSubmissionDto, 'name' | 'birthDate'> {
  // A honeypot: the form hides it from people, so only bots fill it in. The API drops such submissions silently.
  website?: string;
}
