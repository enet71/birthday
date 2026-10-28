import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { AuthController } from '@birthday/web-auth-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { AccountState } from './account.state';

@Injectable()
export class AccountController extends StateController {
  private readonly accountState: AccountState = inject(AccountState);
  private readonly authController: AuthController = inject(AuthController);

  public signInWithGoogle(): void {
    this.runPending(this.authController.signInWithGoogle());
  }

  public signOut(): void {
    this.runPending(this.authController.signOut());
  }

  private runPending(request: Observable<void>): void {
    this.accountState.isPending.set(true);
    request
      .pipe(
        finalize(() => this.accountState.isPending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
