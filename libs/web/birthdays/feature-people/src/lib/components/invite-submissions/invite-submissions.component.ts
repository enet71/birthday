import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { BirthdayAvatarComponent } from '@birthday/web-birthdays-ui';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { LocaleDatePipe } from '@birthday/web-shared-i18n';
import { TranslocoPipe } from '@jsverse/transloco';
import { InvitesController, InvitesState } from '../../state';
import { InviteSubmissionRow } from '../../types';

// Birthdays guests sent through the invite link, waiting to be added or rejected. Renders nothing when there are none.
@Component({
  selector: 'ui-invite-submissions',
  imports: [TranslocoPipe, LocaleDatePipe, MatButton, MatIcon, BirthdayAvatarComponent],
  templateUrl: './invite-submissions.component.html',
  styleUrl: './invite-submissions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteSubmissionsComponent {
  private readonly invitesState: ReadonlyState<InvitesState> = injectState(InvitesState);
  private readonly invitesController: InvitesController = inject(InvitesController);

  protected get rows(): Signal<InviteSubmissionRow[]> {
    return this.invitesState.submissionRows;
  }

  protected approve(row: InviteSubmissionRow): void {
    this.invitesController.approveSubmission(row.submission);
  }

  protected reject(row: InviteSubmissionRow): void {
    this.invitesController.rejectSubmission(row.submission);
  }
}
