import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, ResourceRef, Signal, signal, WritableSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { parseISO } from 'date-fns';
import { InviteLinkDto, InviteSubmissionDto } from '@birthday/shared-models';
import { AuthState } from '@birthday/web-auth-data-access';
import { hasBirthYear } from '@birthday/web-birthdays-util';
import { InvitesApiService } from '@birthday/web-invites-data-access';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { InviteSubmissionRow } from '../types';

// The invite link and the birthdays guests sent through it, on the people page.
@Injectable()
export class InvitesState extends State {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly invitesApi: InvitesApiService = inject(InvitesApiService);
  private readonly document: Document = inject(DOCUMENT);
  private readonly origin: string = this.document.location.origin;

  public readonly isAuthenticated: Signal<boolean> = this.authState.isAuthenticated;
  public readonly submissionsResource: ResourceRef<InviteSubmissionDto[]> = rxResource({
    params: () => (this.authState.isAuthenticated() ? true : undefined),
    stream: () => this.invitesApi.getSubmissions(),
    defaultValue: [],
  });
  // Ids of the submissions being added or rejected.
  public readonly pendingSubmissionIds: WritableSignal<ReadonlySet<string>> = signal(new Set());
  public readonly submissionRows: Signal<InviteSubmissionRow[]> = computed(() => this.createSubmissionRows());

  public readonly isInviteDialogOpen: WritableSignal<boolean> = signal(false);
  // Loaded only while the dialog is open and the user is signed in.
  public readonly linkResource: ResourceRef<InviteLinkDto | null | undefined> = rxResource({
    params: () => (this.isInviteDialogOpen() && this.authState.isAuthenticated() ? true : undefined),
    stream: () => this.invitesApi.getLink(),
  });
  public readonly link: Signal<InviteLinkDto | null> = computed(() => (this.linkResource.hasValue() ? (this.linkResource.value() ?? null) : null));
  public readonly isLinkLoading: Signal<boolean> = computed(() => this.linkResource.isLoading());
  public readonly hasLinkLoadFailed: Signal<boolean> = computed(() => !!this.linkResource.error());
  public readonly inviteUrl: Signal<string | null> = computed(() => (this.link() ? `${this.origin}/invite/${this.link()?.token}` : null));
  // The account name fills the name field before the link exists.
  public readonly suggestedDisplayName: Signal<string> = computed(() => this.authState.user()?.name ?? '');
  // Web Share is missing in most desktop browsers; the dialog offers only copying there.
  public readonly canShare: boolean = typeof this.document.defaultView?.navigator.share === 'function';
  public readonly isSavingLink: WritableSignal<boolean> = signal(false);
  public readonly isSigningIn: WritableSignal<boolean> = signal(false);

  private createSubmissionRows(): InviteSubmissionRow[] {
    const submissions: InviteSubmissionDto[] = this.submissionsResource.hasValue() ? this.submissionsResource.value() : [];
    const pendingIds: ReadonlySet<string> = this.pendingSubmissionIds();

    return submissions.map((submission: InviteSubmissionDto) => ({
      submission,
      birthDate: parseISO(submission.birthDate),
      hasBirthYear: hasBirthYear(submission.birthDate),
      isPending: pendingIds.has(submission.id),
    }));
  }
}
