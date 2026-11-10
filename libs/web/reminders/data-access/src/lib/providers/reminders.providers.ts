import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { RemindersListeners } from '../state';

// Starts the listeners that must run on every page, not only in Settings.
export function provideReminders(): EnvironmentProviders {
  return makeEnvironmentProviders([provideEnvironmentInitializer(() => inject(RemindersListeners))]);
}
