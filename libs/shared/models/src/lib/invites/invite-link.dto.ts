// The signed-in user's invite link. Guests open `/invite/<token>` in the web app.
export interface InviteLinkDto {
  token: string;
  // The name the public page shows as the one who collects birthdays.
  displayName: string;
  enabled: boolean;
}
