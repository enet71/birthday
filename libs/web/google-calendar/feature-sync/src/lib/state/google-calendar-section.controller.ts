import { DOCUMENT, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { GOOGLE_CALENDAR_REDIRECT_PATH, GoogleCalendarController } from '@birthday/web-google-calendar-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { GoogleCalendarSectionState } from './google-calendar-section.state';

@Injectable()
export class GoogleCalendarSectionController extends StateController {
  private readonly sectionState: GoogleCalendarSectionState = inject(GoogleCalendarSectionState);
  private readonly googleCalendarController: GoogleCalendarController = inject(GoogleCalendarController);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly location: Location = inject(Location);
  private readonly document: Document = inject(DOCUMENT);

  constructor() {
    super();
    this.googleCalendarController.reloadConnection();
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.completeConsent();
    }
  }

  // Google returns the user to the redirect page, which shows this section again, and `completeConsent` finishes.
  public connect(): void {
    this.runPending(this.googleCalendarController.connect(`${this.document.location.origin}${GOOGLE_CALENDAR_REDIRECT_PATH}`));
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

  // Google adds `state` with either `code` or `error` (for example, a cancelled consent page) to the redirect page.
  private completeConsent(): void {
    const params: ParamMap = this.route.snapshot.queryParamMap;
    const state: string | null = params.get('state');
    const code: string | null = params.get('code');

    if (!state) {
      return;
    }

    if (code) {
      this.runPending(this.googleCalendarController.completeConnect(code, state));
    } else {
      this.googleCalendarController.reportConsentError(params.get('error') ?? '');
    }
    // The code works once, so a reload or a shared link must not reuse it. Navigating instead would destroy this
    // section and cancel the request.
    this.location.replaceState('/settings');
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
