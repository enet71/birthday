export interface BirthdayChange {
  userId: string;
  birthdayId: string;
  // The Google event of a deleted birthday, which only the change still knows.
  deletedGoogleEventId: string | null;
}
