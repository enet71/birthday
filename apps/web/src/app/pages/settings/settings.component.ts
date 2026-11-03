import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AccountSectionComponent } from '@birthday/web-auth-feature-account';
import { GoogleCalendarSectionComponent } from '@birthday/web-google-calendar-feature-sync';

@Component({
  selector: 'app-settings',
  imports: [MatButton, MatIcon, RouterLink, AccountSectionComponent, GoogleCalendarSectionComponent],
  template: `
    <ui-account-section class="section" />
    <ui-google-calendar-section class="section" />
    <a class="about" matButton routerLink="/about">
      <mat-icon>info</mat-icon>
      About Birthdly
    </a>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 2rem;
    }

    .section {
      max-width: 40rem;
    }

    .about {
      align-self: flex-start;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {}
