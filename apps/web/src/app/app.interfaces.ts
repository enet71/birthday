import { AppTranslateService } from '@birthday/web-shared-i18n';

// Builds a page's schema.org object in the current language; `AppPageMetaStrategy` calls it on navigation and after a language switch.
export type AppStructuredDataFactory = (translator: AppTranslateService) => object;

export type AppTheme = 'light' | 'dark';

// `system` follows the operating system's light or dark setting.
export type AppThemePreference = AppTheme | 'system';
