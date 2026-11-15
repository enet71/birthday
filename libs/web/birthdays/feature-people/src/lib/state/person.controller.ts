import { inject, Injectable } from '@angular/core';
import { BirthdaysController } from '@birthday/web-birthdays-data-access';
import { StateController } from '@birthday/web-shared-data-access';

@Injectable()
export class PersonController extends StateController {
  private readonly birthdaysController: BirthdaysController = inject(BirthdaysController);

  // The route injector is created on every visit, so only the shared birthdays list needs a refresh, which also
  // retries a failed load.
  constructor() {
    super();
    this.birthdaysController.reloadBirthdays();
  }
}
