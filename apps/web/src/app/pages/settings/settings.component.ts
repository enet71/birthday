import { ChangeDetectionStrategy, Component, Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthState } from '@birthday/web-auth-data-access';
import { AccountSectionComponent } from '@birthday/web-auth-feature-account';
import { GoogleCalendarSectionComponent } from '@birthday/web-google-calendar-feature-sync';
import { ReminderSectionComponent } from '@birthday/web-reminders-feature-settings';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { LanguageSectionComponent } from '../../components/language-section';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-settings',
  imports: [
    TranslocoPipe,
    MatButton,
    MatIcon,
    RouterLink,
    AccountSectionComponent,
    GoogleCalendarSectionComponent,
    LanguageSectionComponent,
    ReminderSectionComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);

  protected get isAuthenticated(): Signal<boolean> {
    return this.authState.isAuthenticated;
  }
}
