import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AccountController, AccountState } from '../../state';
import { AccountView } from '../../types';

@Component({
  selector: 'ui-account-section',
  imports: [MatButton, MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatProgressSpinner],
  providers: [AccountState, AccountController],
  templateUrl: './account-section.component.html',
  styleUrl: './account-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountSectionComponent {
  private readonly accountState: ReadonlyState<AccountState> = injectState(AccountState);
  private readonly accountController: AccountController = inject(AccountController);

  protected get view(): Signal<AccountView> {
    return this.accountState.view;
  }

  protected get email(): Signal<string> {
    return this.accountState.email;
  }

  protected get isPending(): Signal<boolean> {
    return this.accountState.isPending;
  }

  protected runAccountAction(): void {
    if (this.view() === 'signedIn') {
      this.accountController.signOut();
    } else {
      this.accountController.signInWithGoogle();
    }
  }
}
