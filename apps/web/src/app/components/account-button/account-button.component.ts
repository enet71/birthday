import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthState } from '@birthday/web-auth-data-access';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AppTranslateService } from '@birthday/web-shared-i18n';

@Component({
  selector: 'app-account-button',
  imports: [MatIcon, RouterLink],
  templateUrl: './account-button.component.html',
  styleUrl: './account-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountButtonComponent {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly translator: AppTranslateService = inject(AppTranslateService);

  protected readonly initial: Signal<string> = computed(() => this.authState.user()?.email?.charAt(0).toUpperCase() ?? '');
  protected readonly label: Signal<string> = computed(() => {
    const email: string | null | undefined = this.authState.user()?.email;

    return email ? this.translator.translate('account.buttonSignedIn', { email }) : this.translator.translate('account.button');
  });
}
