import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable, RESPONSE_INIT } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { PublicInviteDto } from '@birthday/shared-models';
import { toBirthDate } from '@birthday/web-birthdays-util';
import { InvitesApiService } from '@birthday/web-invites-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { INVITE_ANY_LEAP_YEAR } from '../constants';
import { InviteFormModel, InviteLoadResult, InviteSubmitError } from '../types';
import { InviteState } from './invite.state';

@Injectable()
export class InviteController extends StateController {
  private readonly inviteState: InviteState = inject(InviteState);
  private readonly invitesApi: InvitesApiService = inject(InvitesApiService);
  // Only on the server.
  private readonly responseInit: ResponseInit | null = inject(RESPONSE_INIT, { optional: true });

  // The resolver calls it, so the server-rendered title and link preview already name the owner. A dead link answers
  // 404 and an unreachable API 503, so neither is cached or indexed as a working page.
  public openInvite(token: string): Observable<InviteLoadResult> {
    this.inviteState.token.set(token);
    this.inviteState.isSent.set(false);
    this.inviteState.submitError.set(null);

    return this.load(token).pipe(
      tap((result: InviteLoadResult) => {
        this.inviteState.loadResult.set(result);
        if (this.responseInit && result.status !== 'ready') {
          this.responseInit.status = result.status === 'invalid' ? 404 : 503;
        }
      }),
    );
  }

  // Like a failed send, this changes only the page: the tab title keeps what the resolver loaded until the next visit.
  public retry(): void {
    const token: string | null = this.inviteState.token();

    if (!token) {
      return;
    }
    this.inviteState.isRetrying.set(true);
    this.load(token)
      .pipe(
        finalize(() => this.inviteState.isRetrying.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result: InviteLoadResult) => this.inviteState.loadResult.set(result));
  }

  // A filled honeypot is sent as is: the API drops it and answers like for a real birthday.
  public submit({ name, month, day, year, website }: InviteFormModel): void {
    const token: string | null = this.inviteState.token();

    if (!token || this.inviteState.isSending()) {
      return;
    }
    const isYearKnown: boolean = year.trim() !== '';
    const birthDate: string = toBirthDate(new Date(isYearKnown ? Number(year) : INVITE_ANY_LEAP_YEAR, month - 1, day), isYearKnown);

    this.inviteState.isSending.set(true);
    this.inviteState.submitError.set(null);
    this.invitesApi
      .submit(token, { name: name.trim(), birthDate, ...(website && { website }) })
      .pipe(
        map((): InviteSubmitError | null => null),
        catchError((error: unknown) => of(this.handleSubmitError(error))),
        finalize(() => this.inviteState.isSending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((submitError: InviteSubmitError | null) => {
        this.inviteState.submitError.set(submitError);
        this.inviteState.isSent.set(!submitError && this.inviteState.loadResult()?.status === 'ready');
      });
  }

  public sendAnother(): void {
    this.inviteState.isSent.set(false);
    this.inviteState.submitError.set(null);
  }

  private load(token: string): Observable<InviteLoadResult> {
    return this.invitesApi.getPublicInvite(token).pipe(
      map((invite: PublicInviteDto): InviteLoadResult => ({ status: 'ready', invite })),
      catchError((error: unknown) => of<InviteLoadResult>(isNotFound(error) ? { status: 'invalid' } : { status: 'failed' })),
    );
  }

  // The link may have been turned off while the page was open; the page then says so instead of showing an error.
  private handleSubmitError(error: unknown): InviteSubmitError | null {
    if (isNotFound(error)) {
      this.inviteState.loadResult.set({ status: 'invalid' });
      return null;
    }
    if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict) {
      return 'full';
    }
    if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.TooManyRequests) {
      return 'tooMany';
    }
    return 'failed';
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound;
}
