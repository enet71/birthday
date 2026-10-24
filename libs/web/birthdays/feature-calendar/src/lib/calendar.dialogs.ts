import {
  effect,
  EnvironmentProviders,
  inject,
  Injector,
  provideEnvironmentInitializer,
  untracked,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AddBirthdayDialogComponent } from './dialogs';
import { CalendarController, CalendarState } from './state';
import { AddBirthdayDialogData } from './types';

// Opens and closes the Add Birthday dialog from `CalendarState.addBirthdayDialog`.
export function provideAddBirthdayDialog(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const calendarState: ReadonlyState<CalendarState> =
      injectState(CalendarState);
    const calendarController: CalendarController = inject(CalendarController);
    const dialog: MatDialog = inject(MatDialog);
    // The dialog injects the route-scoped CalendarController.
    const injector: Injector = inject(Injector);
    let dialogRef: MatDialogRef<AddBirthdayDialogComponent> | null = null;

    effect(() => {
      const data: AddBirthdayDialogData | null =
        calendarState.addBirthdayDialog();

      untracked(() => {
        if (!data) {
          dialogRef?.close();
          return;
        }

        if (dialogRef) {
          return;
        }

        dialogRef = dialog.open(AddBirthdayDialogComponent, {
          data,
          injector,
          autoFocus: 'input',
          width: '26rem',
          maxWidth: 'calc(100vw - 2rem)',
        });
        dialogRef.afterClosed().subscribe(() => {
          dialogRef = null;
          calendarController.closeAddBirthdayDialog();
        });
      });
    });
  });
}
