import { BirthdayChange } from '../types';

// Hears about every change `BirthdaysService` makes, for example to mirror it into Google Calendar. Another module
// provides it. It must not throw: the change is already saved, and the request must not fail because of a follower.
export abstract class BirthdayChangesListener {
  public abstract birthdayChanged(change: BirthdayChange): Promise<void>;
}
