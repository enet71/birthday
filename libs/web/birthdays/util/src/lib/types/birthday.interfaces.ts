export interface Birthday {
  id: string;
  name: string;
  // Birth date in the `yyyy-MM-dd` format.
  birthDate: string;
}

export interface UpcomingBirthday {
  birthday: Birthday;
  date: Date;
  daysUntil: number;
}
