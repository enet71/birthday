import { InviteLinkDto } from './invite-link.dto';

// `link` is null until the user creates one.
export interface InviteLinkResponse {
  link: InviteLinkDto | null;
}
