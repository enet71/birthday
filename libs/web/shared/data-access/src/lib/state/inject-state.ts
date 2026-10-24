import { inject, Signal, Type, WritableSignal } from '@angular/core';

export type ReadonlyState<T> = {
  [K in keyof T]: T[K] extends WritableSignal<infer U> ? Signal<U> : T[K];
};

export function injectState<T extends object>(
  token: Type<T>,
): ReadonlyState<T> {
  return inject(token) as ReadonlyState<T>;
}
