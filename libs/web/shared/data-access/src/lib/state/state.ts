import { Subject } from 'rxjs';
import { DestroyRef, inject, isDevMode } from '@angular/core';

export abstract class StateController {
  public readonly reset: Subject<void> = new Subject();
  public readonly destroyRef: DestroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this._resetState());
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public resetState(): void {}

  private _resetState(): void {
    if (isDevMode()) {
      console.info('Reset Controller', this.constructor.name);
    }
    this.reset.next();
    this.resetState();
  }
}

export abstract class State {
  public readonly reset: Subject<void> = new Subject();
  public readonly destroyRef: DestroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this._resetState());
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public resetState(): void {}

  private _resetState(): void {
    if (isDevMode()) {
      console.info('Reset State', this.constructor.name);
    }
    this.reset.next();
    this.resetState();
  }
}
