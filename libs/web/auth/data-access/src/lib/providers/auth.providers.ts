import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { AuthController } from '../state';

// Creates the auth controller with the app, so One Tap and the session restore error work on every page.
export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([provideEnvironmentInitializer(() => inject(AuthController))]);
}
