import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AccountSectionComponent } from '@birthday/web-auth-feature-account';
import { GoogleCalendarSectionComponent } from '@birthday/web-google-calendar-feature-sync';

@Component({
  selector: 'app-settings',
  imports: [MatButton, MatIcon, RouterLink, AccountSectionComponent, GoogleCalendarSectionComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {}
