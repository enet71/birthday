import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { SettingsRowComponent, SettingsSectionComponent } from '@birthday/web-shared-ui';
import { APP_THEME_PREFERENCES } from '../../app.constants';
import { AppThemePreference } from '../../app.interfaces';
import { ThemeController, ThemeState } from '../../state';

@Component({
  selector: 'app-theme-section',
  imports: [MatButtonToggle, MatButtonToggleGroup, MatIcon, SettingsRowComponent, SettingsSectionComponent, TranslocoPipe],
  templateUrl: './theme-section.component.html',
  styleUrl: './theme-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSectionComponent {
  private readonly themeState: ReadonlyState<ThemeState> = injectState(ThemeState);
  private readonly themeController: ThemeController = inject(ThemeController);

  protected readonly preferences: readonly AppThemePreference[] = APP_THEME_PREFERENCES;
  protected readonly icons: Record<AppThemePreference, string> = {
    system: 'contrast',
    light: 'light_mode',
    dark: 'dark_mode',
  };

  protected get preference(): Signal<AppThemePreference> {
    return this.themeState.preference;
  }

  protected changePreference(preference: AppThemePreference): void {
    this.themeController.changePreference(preference);
  }
}
