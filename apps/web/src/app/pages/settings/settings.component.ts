import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AccountSectionComponent } from '@birthday/web-auth-feature-account';

@Component({
  selector: 'app-settings',
  imports: [MatButton, MatIcon, RouterLink, AccountSectionComponent],
  template: `
    <ui-account-section class="account" />
    <a class="about" matButton routerLink="/about">
      <mat-icon>info</mat-icon>
      About Birthdly
    </a>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      padding-bottom: 2rem;
    }

    .account {
      max-width: 40rem;
    }

    .about {
      align-self: flex-start;
      margin-top: 1.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {}
