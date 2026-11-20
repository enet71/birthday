import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, Signal, WritableSignal } from '@angular/core';
import { FieldTree, form, FormField, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { InviteLinkDto } from '@birthday/shared-models';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { DialogHeaderComponent } from '@birthday/web-shared-ui';
import { TranslocoPipe } from '@jsverse/transloco';
import { INVITE_DISPLAY_NAME_MAX_LENGTH } from '../../constants';
import { InvitesController, InvitesState } from '../../state';
import { InviteLinkFormModel } from '../../types';

@Component({
  selector: 'ui-invite-dialog',
  imports: [
    TranslocoPipe,
    FormField,
    MatButton,
    MatIconButton,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatError,
    MatFormField,
    MatHint,
    MatIcon,
    MatInput,
    MatLabel,
    MatPrefix,
    MatProgressSpinner,
    MatSlideToggle,
    MatSuffix,
    DialogHeaderComponent,
  ],
  templateUrl: './invite-dialog.component.html',
  styleUrl: './invite-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteDialogComponent {
  private readonly invitesState: ReadonlyState<InvitesState> = injectState(InvitesState);
  private readonly invitesController: InvitesController = inject(InvitesController);

  protected readonly displayNameMaxLength: number = INVITE_DISPLAY_NAME_MAX_LENGTH;
  protected readonly canShare: boolean = this.invitesState.canShare;
  // The saved name, or the account name before the link exists. A string, so saving the switch or reissuing the link,
  // which keep the name, does not reset what the user is typing.
  private readonly savedDisplayName: Signal<string> = computed(
    () => this.invitesState.link()?.displayName ?? this.invitesState.suggestedDisplayName(),
  );
  protected readonly model: WritableSignal<InviteLinkFormModel> = linkedSignal({
    source: this.savedDisplayName,
    computation: (displayName: string) => ({ displayName }),
  });
  // Error messages are translation keys; the template translates them.
  protected readonly linkForm: FieldTree<InviteLinkFormModel> = form(this.model, (path) => {
    required(path.displayName, { message: 'invites.errors.nameRequired' });
    pattern(path.displayName, /\S/, { message: 'invites.errors.nameRequired' });
    maxLength(path.displayName, INVITE_DISPLAY_NAME_MAX_LENGTH, { message: 'invites.errors.nameTooLong' });
  });
  protected readonly isNameChanged: Signal<boolean> = computed(() => this.model().displayName.trim() !== this.savedDisplayName());

  protected get isAuthenticated(): Signal<boolean> {
    return this.invitesState.isAuthenticated;
  }

  protected get isSigningIn(): Signal<boolean> {
    return this.invitesState.isSigningIn;
  }

  protected get link(): Signal<InviteLinkDto | null> {
    return this.invitesState.link;
  }

  protected get inviteUrl(): Signal<string | null> {
    return this.invitesState.inviteUrl;
  }

  protected get isLinkLoading(): Signal<boolean> {
    return this.invitesState.isLinkLoading;
  }

  protected get hasLinkLoadFailed(): Signal<boolean> {
    return this.invitesState.hasLinkLoadFailed;
  }

  protected get isSavingLink(): Signal<boolean> {
    return this.invitesState.isSavingLink;
  }

  protected signInWithGoogle(): void {
    this.invitesController.signInWithGoogle();
  }

  protected reloadLink(): void {
    this.invitesController.reloadLink();
  }

  protected saveDisplayName(event: Event): void {
    event.preventDefault();
    // `submit` requires a Promise-returning action; saving itself stays an Observable in the controller.
    submit(this.linkForm, async () => this.invitesController.saveDisplayName(this.model().displayName));
  }

  // The switch flips itself on click; it is put back at once, so it shows the saved state and moves only when the save
  // succeeds. A failed save would otherwise leave it showing a state the link does not have.
  protected setLinkEnabled(change: MatSlideToggleChange): void {
    change.source.checked = !change.checked;
    this.invitesController.setLinkEnabled(change.checked);
  }

  protected copyLink(): void {
    this.invitesController.copyLink();
  }

  protected shareLink(): void {
    this.invitesController.shareLink();
  }

  protected reissueLink(): void {
    this.invitesController.reissueLink();
  }
}
