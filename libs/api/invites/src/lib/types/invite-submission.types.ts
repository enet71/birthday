// A submission a guest has just sent, as `InviteSubmissionsListener` hears about it.
export interface CreatedInviteSubmission {
  // The link owner.
  userId: string;
  // The guest's name, as they entered it.
  name: string;
}
