import { inject, Injectable } from '@angular/core';
import { StateController } from '@birthday/web-shared-data-access';
import { Birthday, toBirthDate } from '@birthday/web-birthdays-util';
import { BirthdaysState } from './birthdays.state';

@Injectable({ providedIn: 'root' })
export class BirthdaysController extends StateController {
  private readonly birthdaysState: BirthdaysState = inject(BirthdaysState);

  public addBirthday(name: string, date: Date): void {
    const birthday: Birthday = {
      // `crypto.randomUUID` is unavailable outside secure contexts (e.g. a LAN IP over HTTP).
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      birthDate: toBirthDate(date),
    };

    this.birthdaysState.birthdays.update((birthdays: Birthday[]) => [
      ...birthdays,
      birthday,
    ]);
  }
}
