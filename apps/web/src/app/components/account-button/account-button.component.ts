import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
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

  // The picture address that failed to load, so the button falls back to the initial until the address changes.
  private readonly failedPicture: WritableSignal<string | null> = signal(null);
  protected readonly picture: Signal<string | null> = computed(() => this.visiblePicture());
  protected readonly initial: Signal<string> = computed(() => this.authState.user()?.email?.charAt(0).toUpperCase() ?? '');
  protected readonly label: Signal<string> = computed(() => {
    const email: string | null | undefined = this.authState.user()?.email;

    return email ? this.translator.translate('account.buttonSignedIn', { email }) : this.translator.translate('account.button');
  });

  protected onPictureError(picture: string): void {
    this.failedPicture.set(picture);
  }

  private visiblePicture(): string | null {
    const picture: string | null = this.authState.user()?.picture ?? null;

    return picture === this.failedPicture() ? null : picture;
  }
}
