import { InviteLinkDto } from './invite-link.dto';

// What a guest sees of an enabled invite link.
export type PublicInviteDto = Pick<InviteLinkDto, 'displayName'>;
