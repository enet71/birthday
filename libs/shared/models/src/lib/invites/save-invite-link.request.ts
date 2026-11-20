import { InviteLinkDto } from './invite-link.dto';

// Creates the link with a new token, or changes the existing one.
export type SaveInviteLinkRequest = Pick<InviteLinkDto, 'displayName' | 'enabled'>;
