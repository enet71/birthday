// A birthday a guest sent through an invite link, waiting for the link owner to add or reject it.
export interface InviteSubmissionDto {
  id: string;
  name: string;
  // Birth date in the `yyyy-MM-dd` format; the year 0004 marks an unknown birth year.
  birthDate: string;
  // ISO 8601 date and time.
  createdAt: string;
}
