import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { GoogleCalendarController } from '@birthday/web-google-calendar-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { GoogleCalendarSectionState } from './google-calendar-section.state';

@Injectable()
export class GoogleCalendarSectionController extends StateController {
  private readonly sectionState: GoogleCalendarSectionState = inject(GoogleCalendarSectionState);
  private readonly googleCalendarController: GoogleCalendarController = inject(GoogleCalendarController);

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

  public disconnect(): void {
    this.runPending(this.googleCalendarController.disconnect());
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
