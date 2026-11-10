import { effect, inject, Injectable } from '@angular/core';
import { catchError, EMPTY } from 'rxjs';
import { AuthState } from '@birthday/web-auth-data-access';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { DevicePushService } from '../services';

// Stops notifications on this device when its user signs out. The session is gone by then, so the subscription
// cannot be deleted through the backend; the push service rejects the next message to it, and the backend deletes it.
// It does not use `RemindersState`, so the reminder data loads only where it is shown.
@Injectable({ providedIn: 'root' })
export class RemindersListeners {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly devicePush: DevicePushService = inject(DevicePushService);
  private signedInUserId: string | null = null;

  constructor() {
    effect(() => {
      if (this.authState.status() === 'unknown') {
        return;
      }

      const userId: string | null = this.authState.user()?.id ?? null;

      if (this.signedInUserId && this.signedInUserId !== userId && this.devicePush.getSupport() === 'supported') {
        this.devicePush
          .unsubscribe()
          .pipe(catchError(() => EMPTY))
          .subscribe();
      }
      this.signedInUserId = userId;
    });
  }
}
