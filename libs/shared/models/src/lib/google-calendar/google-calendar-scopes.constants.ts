// The web app asks Google for these scopes and the API checks that all were granted. `calendar.events.owned` writes
// birthday events into the user's primary calendar; `contacts.readonly` reads the birthdays of the user's contacts.
export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events.owned', 'https://www.googleapis.com/auth/contacts.readonly'];
