import { ActivatedRouteSnapshot } from '@angular/router';

// The part of the app's translation service that route texts use; declared here because the i18n library depends on this one.
export interface AppRouteTranslator {
  translate(key: string, params?: Record<string, unknown>): string;
  // Picks the plural form of `key` for `count`, which is available in the text as `{{ count }}`.
  translatePlural(key: string, count: number, params?: Record<string, unknown>): string;
  // `formatKey` is a translation key with an Angular date format.
  formatDate(value: Date | string | number, formatKey: string): string;
}

// Builds a text from the route (its params and resolved data) in the current language.
export type AppRouteTextFactory = (translator: AppRouteTranslator, route: ActivatedRouteSnapshot) => string;

// A translation key, or a factory for texts that depend on the route.
export type AppRouteText = string | AppRouteTextFactory;

// Builds a page's schema.org object in the current language; called on navigation and after a language switch.
export type AppStructuredDataFactory = (translator: AppRouteTranslator, route: ActivatedRouteSnapshot) => object;
