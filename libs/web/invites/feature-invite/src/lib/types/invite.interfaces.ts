import { PublicInviteDto } from '@birthday/shared-models';

// `invalid`: the link was turned off, reissued, or never existed. `failed`: the API could not be reached.
export type InviteLoadResult = { status: 'ready'; invite: PublicInviteDto } | { status: 'invalid' } | { status: 'failed' };

// `full`: the owner has too many requests waiting. `tooMany`: this device sent too many.
export type InviteSubmitError = 'full' | 'tooMany' | 'failed';

export interface InviteFormModel {
  name: string;
  // 1–12.
  month: number;
  day: number;
  // Empty when the guest leaves the birth year out.
  year: string;
  // The honeypot; people never see it.
  website: string;
}
