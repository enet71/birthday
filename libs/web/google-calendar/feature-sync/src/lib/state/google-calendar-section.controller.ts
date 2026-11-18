import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { filter, finalize, Observable } from 'rxjs';
import { GoogleCalendarController } from '@birthday/web-google-calendar-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { GoogleCalendarDisconnectDialogComponent } from '../dialogs';
import { GoogleCalendarDisconnectDialogResult } from '../types';
import { GoogleCalendarSectionState } from './google-calendar-section.state';

@Injectable()
export class GoogleCalendarSectionController extends StateController {
  private readonly sectionState: GoogleCalendarSectionState = inject(GoogleCalendarSectionState);
  private readonly googleCalendarController: GoogleCalendarController = inject(GoogleCalendarController);
  private readonly dialog: MatDialog = inject(MatDialog);

  constructor() {
    super();
    this.googleCalendarController.reloadConnection();
  }

  // Call it while handling the click: it opens the Google popup.
  public connect(): void {
    this.runPending(this.googleCalendarController.connect());
  }

  public syncNow(): void {
    this.runPending(this.googleCalendarController.syncNow());
  }

  // Asks whether to remove Birthdly's birthdays from Google Calendar too; cancelling keeps the connection.
  public openDisconnectDialog(): void {
    this.dialog
      .open<GoogleCalendarDisconnectDialogComponent, void, GoogleCalendarDisconnectDialogResult | ''>(GoogleCalendarDisconnectDialogComponent, {
        width: '28rem',
        maxWidth: 'calc(100vw - 2rem)',
      })
      .afterClosed()
      .pipe(
        // Only Disconnect closes with a result object; Cancel's bare `mat-dialog-close` closes with '', Escape and the
        // backdrop with `undefined`.
        filter((result: GoogleCalendarDisconnectDialogResult | '' | undefined): result is GoogleCalendarDisconnectDialogResult => !!result),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ removeEvents }: GoogleCalendarDisconnectDialogResult) => this.runPending(this.googleCalendarController.disconnect(removeEvents)));
  }

  public reloadConnection(): void {
    this.googleCalendarController.reloadConnection();
  }

  private runPending(request: Observable<void>): void {
    this.sectionState.isPending.set(true);
    request
      .pipe(
        finalize(() => this.sectionState.isPending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
