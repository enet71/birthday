import { effect, EnvironmentProviders, inject, Injector, provideEnvironmentInitializer, untracked } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { InviteDialogComponent } from './dialogs';
import { InvitesController, InvitesState } from './state';

// Opens and closes the Invite dialog from `InvitesState.isInviteDialogOpen`.
export function provideInviteDialog(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const invitesState: ReadonlyState<InvitesState> = injectState(InvitesState);
    const invitesController: InvitesController = inject(InvitesController);
    const dialog: MatDialog = inject(MatDialog);
    // The dialog injects the route-scoped InvitesState and InvitesController.
    const injector: Injector = inject(Injector);
    let dialogRef: MatDialogRef<InviteDialogComponent> | null = null;

    effect(() => {
      const isOpen: boolean = invitesState.isInviteDialogOpen();

      untracked(() => {
        if (!isOpen) {
          dialogRef?.close();
          return;
        }

        if (dialogRef) {
          return;
        }

        dialogRef = dialog.open(InviteDialogComponent, {
          injector,
          autoFocus: 'dialog',
          width: '32rem',
          maxWidth: 'calc(100vw - 2rem)',
        });
        dialogRef.afterClosed().subscribe(() => {
          dialogRef = null;
          invitesController.closeInviteDialog();
        });
      });
    });
  });
}
