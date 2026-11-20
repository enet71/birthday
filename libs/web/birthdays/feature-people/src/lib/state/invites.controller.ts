import { Clipboard } from '@angular/cdk/clipboard';
import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { effect, inject, Injectable, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, last, map, Observable, of } from 'rxjs';
import { InviteLinkDto, InviteSubmissionDto, SaveInviteLinkRequest } from '@birthday/shared-models';
import { AuthController } from '@birthday/web-auth-data-access';
import { BirthdaysController } from '@birthday/web-birthdays-data-access';
import { InvitesApiService } from '@birthday/web-invites-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { AppTranslateService } from '@birthday/web-shared-i18n';
import { NotificationsService } from '@birthday/web-shared-util';
import { SubmissionChangeResult } from '../types';
import { InvitesState } from './invites.state';

@Injectable()
export class InvitesController extends StateController {
  private readonly invitesState: InvitesState = inject(InvitesState);
  private readonly invitesApi: InvitesApiService = inject(InvitesApiService);
  private readonly authController: AuthController = inject(AuthController);
  private readonly birthdaysController: BirthdaysController = inject(BirthdaysController);
  private readonly notifications: NotificationsService = inject(NotificationsService);
  private readonly translator: AppTranslateService = inject(AppTranslateService);
  private readonly clipboard: Clipboard = inject(Clipboard);
  private readonly navigator: Navigator | undefined = inject(DOCUMENT).defaultView?.navigator;

  constructor() {
    super();
    effect(() => {
      if (this.invitesState.submissionsResource.error()) {
        // Untracked, so a language switch does not show the error again.
        untracked(() => this.notifications.createErrorNotification(this.translator.translate('notifications.invites.loadFailed')));
      }
    });
  }

  public openInviteDialog(): void {
    this.invitesState.isInviteDialogOpen.set(true);
  }

  public closeInviteDialog(): void {
    this.invitesState.isInviteDialogOpen.set(false);
  }

  public reloadLink(): void {
    this.invitesState.linkResource.reload();
  }

  // Creates the link on first use; otherwise changes the name and keeps it enabled as it is.
  public saveDisplayName(displayName: string): void {
    this.saveLink({ displayName: displayName.trim(), enabled: this.invitesState.link()?.enabled ?? true });
  }

  public setLinkEnabled(enabled: boolean): void {
    const link: InviteLinkDto | null = this.invitesState.link();

    if (link) {
      this.saveLink({ displayName: link.displayName, enabled });
    }
  }

  public reissueLink(): void {
    this.runLinkChange(this.invitesApi.reissueLink(), 'notifications.invites.reissued');
  }

  public copyLink(): void {
    const url: string | null = this.invitesState.inviteUrl();

    if (!url) {
      return;
    }
    if (this.clipboard.copy(url)) {
      this.notifications.createSuccessNotification(this.translator.translate('notifications.invites.copied'));
    } else {
      this.notifications.createErrorNotification(this.translator.translate('notifications.invites.copyFailed'));
    }
  }

  // Call it while handling the click: browsers allow sharing only right after a user action.
  public shareLink(): void {
    const url: string | null = this.invitesState.inviteUrl();

    if (!url || !this.navigator) {
      return;
    }
    // Rejects when the user closes the share sheet, which needs no message.
    this.navigator.share({ title: this.translator.translate('invites.shareTitle'), url }).catch(() => undefined);
  }

  public signInWithGoogle(): void {
    this.invitesState.isSigningIn.set(true);
    this.authController
      .signInWithGoogle()
      .pipe(
        finalize(() => this.invitesState.isSigningIn.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  // The birthday is created on the server, so the shared list loads it from there.
  public approveSubmission(submission: InviteSubmissionDto): void {
    this.runSubmissionChange(submission, this.invitesApi.approveSubmission(submission.id), 'notifications.invites.approveFailed', () => {
      this.birthdaysController.reloadBirthdaysWhenIdle();
      this.notifications.createSuccessNotification(this.translator.translate('notifications.invites.approved', { name: submission.name }));
    });
  }

  public rejectSubmission(submission: InviteSubmissionDto): void {
    this.runSubmissionChange(submission, this.invitesApi.rejectSubmission(submission.id), 'notifications.invites.rejectFailed');
  }

  private saveLink(request: SaveInviteLinkRequest): void {
    this.runLinkChange(this.invitesApi.saveLink(request));
  }

  private runLinkChange(change$: Observable<InviteLinkDto>, successKey?: string): void {
    this.invitesState.isSavingLink.set(true);
    change$
      .pipe(
        catchError(() => {
          this.notifications.createErrorNotification(this.translator.translate('notifications.invites.saveFailed'));
          return EMPTY;
        }),
        finalize(() => this.invitesState.isSavingLink.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((link: InviteLinkDto) => {
        this.invitesState.linkResource.set(link);
        if (successKey) {
          this.notifications.createSuccessNotification(this.translator.translate(successKey));
        }
      });
  }

  // A `DELETE` response may complete without emitting, so success is taken from completing without an error. 404 means
  // the submission was already added or rejected elsewhere, for example in another tab: it leaves the list quietly, and
  // the birthdays list is refreshed in case it was added.
  private runSubmissionChange(submission: InviteSubmissionDto, change$: Observable<unknown>, errorKey: string, onDone?: () => void): void {
    this.setSubmissionPending(submission.id, true);
    change$
      .pipe(
        last(null, null),
        map((): SubmissionChangeResult => 'done'),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound) {
            return of<SubmissionChangeResult>('gone');
          }
          this.notifications.createErrorNotification(this.translator.translate(errorKey));
          return of<SubmissionChangeResult>('failed');
        }),
        finalize(() => this.setSubmissionPending(submission.id, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result: SubmissionChangeResult) => {
        if (result === 'failed') {
          return;
        }
        this.removeSubmission(submission.id);
        if (result === 'done') {
          onDone?.();
        } else {
          this.birthdaysController.reloadBirthdaysWhenIdle();
        }
      });
  }

  private setSubmissionPending(id: string, isPending: boolean): void {
    this.invitesState.pendingSubmissionIds.update((ids: ReadonlySet<string>) => {
      const next = new Set(ids);

      if (isPending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  // Writes through `submissionRows()`, so a failed load is updated from an empty list.
  private removeSubmission(id: string): void {
    const isLoading: boolean = this.invitesState.submissionsResource.isLoading();

    this.invitesState.submissionsResource.set(
      this.invitesState
        .submissionRows()
        .map((row) => row.submission)
        .filter((submission: InviteSubmissionDto) => submission.id !== id),
    );
    // `set()` aborts an in-flight load, so load the list again without the removed submission.
    if (isLoading) {
      this.invitesState.submissionsResource.reload();
    }
  }
}
