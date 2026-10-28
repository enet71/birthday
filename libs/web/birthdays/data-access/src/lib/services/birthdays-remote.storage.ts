import { BirthdaysStorage } from './birthdays.storage';

// The account storage for a signed-in user. The app config picks the backend that implements it.
export abstract class BirthdaysRemoteStorage extends BirthdaysStorage {}
