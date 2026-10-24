import { StateController } from '../state';
import { inject, Type } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { afterNavigate } from '@birthday/web-shared-util';

export const resetStateOnDeactivate: (
  controllers: Type<StateController>[],
) => CanDeactivateFn<unknown> = (controllers: Type<StateController>[]) => {
  return () => {
    const router: Router = inject(Router);
    const stateControllers: StateController[] = controllers.map(
      (service: Type<StateController>) => inject(service),
    );
    afterNavigate(router).subscribe(() =>
      stateControllers.forEach((stateController: StateController) =>
        stateController.resetState(),
      ),
    );
    return true;
  };
};
