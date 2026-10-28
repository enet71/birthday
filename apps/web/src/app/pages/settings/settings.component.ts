import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AccountSectionComponent } from '@birthday/web-auth-feature-account';

@Component({
  selector: 'app-settings',
  imports: [AccountSectionComponent],
  template: `<ui-account-section class="account" />`,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      padding-bottom: 2rem;
    }

    .account {
      max-width: 40rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {}
