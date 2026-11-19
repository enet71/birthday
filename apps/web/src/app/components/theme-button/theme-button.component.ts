import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AppTheme } from '../../app.interfaces';
import { ThemeController, ThemeState } from '../../state';

@Component({
  selector: 'app-theme-button',
  imports: [MatIcon, MatIconButton, TranslocoPipe],
  templateUrl: './theme-button.component.html',
  styleUrl: './theme-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeButtonComponent {
  private readonly themeState: ReadonlyState<ThemeState> = injectState(ThemeState);
  private readonly themeController: ThemeController = inject(ThemeController);

  protected get theme(): Signal<AppTheme> {
    return this.themeState.theme;
  }

  protected toggle(): void {
    this.themeController.toggleTheme();
  }
}
