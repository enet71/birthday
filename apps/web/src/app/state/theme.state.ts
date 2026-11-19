import { computed, inject, Injectable, linkedSignal, Signal, WritableSignal } from '@angular/core';
import { State } from '@birthday/web-shared-data-access';
import { BrowserStorageService, LocalStorageKey, PlatformService } from '@birthday/web-shared-util';
import { APP_DARK_SCHEME_QUERY, APP_THEME_PREFERENCES } from '../app.constants';
import { AppTheme, AppThemePreference } from '../app.interfaces';

@Injectable({ providedIn: 'root' })
export class ThemeState extends State {
  private readonly platform: PlatformService = inject(PlatformService);
  private readonly browserStorage: BrowserStorageService = inject(BrowserStorageService);

  // Before the first client render (and on the server) both keep the defaults, so hydration matches the server HTML;
  // the inline script in `index.html` has already applied the real theme to the page by then.
  public readonly preference: WritableSignal<AppThemePreference> = linkedSignal(() =>
    this.platform.isRendered() ? this.readStoredPreference() : 'system',
  );
  public readonly systemTheme: WritableSignal<AppTheme> = linkedSignal(() =>
    this.platform.isRendered() && matchMedia(APP_DARK_SCHEME_QUERY).matches ? 'dark' : 'light',
  );

  // The theme on screen.
  public readonly theme: Signal<AppTheme> = computed(() => (this.preference() === 'system' ? this.systemTheme() : (this.preference() as AppTheme)));

  private readStoredPreference(): AppThemePreference {
    const stored: string | null = this.browserStorage.getLocalItem(LocalStorageKey.THEME);

    return APP_THEME_PREFERENCES.find((preference: AppThemePreference) => preference === stored) ?? 'system';
  }
}
