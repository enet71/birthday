import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { StateController } from '@birthday/web-shared-data-access';
import { BrowserStorageService, LocalStorageKey, PlatformService } from '@birthday/web-shared-util';
import { APP_DARK_SCHEME_QUERY, APP_THEME_COLORS } from '../app.constants';
import { AppTheme, AppThemePreference } from '../app.interfaces';
import { ThemeState } from './theme.state';

@Injectable({ providedIn: 'root' })
export class ThemeController extends StateController {
  private readonly themeState: ThemeState = inject(ThemeState);
  private readonly browserStorage: BrowserStorageService = inject(BrowserStorageService);
  private readonly platform: PlatformService = inject(PlatformService);
  private readonly document: Document = inject(DOCUMENT);
  private readonly meta: Meta = inject(Meta);

  constructor() {
    super();

    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.watchSystemTheme();
    }

    // Guarded by `isRendered()`: before it the State holds defaults, which must not overwrite the saved choice or the
    // theme the inline script applied.
    effect(() => {
      const preference: AppThemePreference = this.themeState.preference();

      if (this.platform.isRendered()) {
        this.applyPreference(preference);
      }
    });

    effect(() => {
      const theme: AppTheme = this.themeState.theme();

      if (this.platform.isRendered()) {
        this.meta.updateTag({ name: 'theme-color', content: APP_THEME_COLORS[theme] });
      }
    });
  }

  public changePreference(preference: AppThemePreference): void {
    this.themeState.preference.set(preference);
  }

  // Switches to the opposite of the theme on screen, which also leaves the system mode.
  public toggleTheme(): void {
    this.changePreference(this.themeState.theme() === 'dark' ? 'light' : 'dark');
  }

  private watchSystemTheme(): void {
    const query: MediaQueryList = matchMedia(APP_DARK_SCHEME_QUERY);
    const update = (event: MediaQueryListEvent): void => this.themeState.systemTheme.set(event.matches ? 'dark' : 'light');

    query.addEventListener('change', update);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', update));
  }

  private applyPreference(preference: AppThemePreference): void {
    const root: HTMLElement = this.document.documentElement;

    if (preference === 'system') {
      root.removeAttribute('data-theme');
      this.browserStorage.removeLocalItem(LocalStorageKey.THEME);
    } else {
      root.setAttribute('data-theme', preference);
      this.browserStorage.setLocalItem(LocalStorageKey.THEME, preference);
    }
  }
}
