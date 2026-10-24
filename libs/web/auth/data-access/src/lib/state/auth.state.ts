import { Injectable, signal, WritableSignal } from '@angular/core';
import { State } from '@birthday/web-shared-data-access';

@Injectable({ providedIn: 'root' })
export class AuthState extends State {
  // Always `false` until sign-in exists, so data stays in local storage.
  public readonly isAuthenticated: WritableSignal<boolean> = signal(false);

  public override resetState(): void {
    this.isAuthenticated.set(false);
  }
}
