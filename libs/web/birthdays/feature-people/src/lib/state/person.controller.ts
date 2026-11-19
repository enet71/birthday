import { inject, Injectable } from '@angular/core';
import { BirthdaysController } from '@birthday/web-birthdays-data-access';
import { AppLayoutController } from '@birthday/web-layout-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { PersonState } from './person.state';

@Injectable()
export class PersonController extends StateController {
  private readonly personState: PersonState = inject(PersonState);
  private readonly birthdaysController: BirthdaysController = inject(BirthdaysController);
  private readonly appLayoutController: AppLayoutController = inject(AppLayoutController);

  // The route injector is created on every visit, so only the shared birthdays list needs a refresh, which also
  // retries a failed load.
  constructor() {
    super();
    this.birthdaysController.reloadBirthdays();
    this.appLayoutController.trackLoading(this.personState.isLoading, this.destroyRef);
  }
}
