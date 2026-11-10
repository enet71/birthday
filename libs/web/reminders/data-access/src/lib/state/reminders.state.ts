import { computed, inject, Injectable, linkedSignal, ResourceRef, Signal, WritableSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, Observable, of, switchMap } from 'rxjs';
import { AuthState } from '@birthday/web-auth-data-access';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { PlatformService } from '@birthday/web-shared-util';
import { DevicePushService, RemindersClient } from '../services';
import { DevicePushSubscription, PushSupport, ReminderSettings } from '../types';

@Injectable({ providedIn: 'root' })
export class RemindersState extends State {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly remindersClient: RemindersClient = inject(RemindersClient);
  private readonly devicePush: DevicePushService = inject(DevicePushService);
  private readonly platform: PlatformService = inject(PlatformService);

  // The browser APIs are read only after the first client render, so the server and hydration see `unsupported`.
  public readonly support: Signal<PushSupport> = computed(() => (this.platform.isRendered() ? this.devicePush.getSupport() : 'unsupported'));
  // The browser does not report changes, so the Controller reads it again after asking for it.
  public readonly permission: WritableSignal<NotificationPermission | null> = linkedSignal(() =>
    this.platform.isRendered() ? this.devicePush.getPermission() : null,
  );

  // Both load only for a signed-in user and again after every change of user.
  public readonly settingsResource: ResourceRef<ReminderSettings | null | undefined> = rxResource({
    params: () => this.authState.user()?.id,
    stream: () => this.remindersClient.getSettings(),
  });
  // This browser's subscription when the signed-in user gets notifications on it, otherwise `null`.
  public readonly deviceSubscriptionResource: ResourceRef<DevicePushSubscription | null | undefined> = rxResource({
    params: () => (this.support() === 'supported' ? this.authState.user()?.id : undefined),
    stream: () => this.loadDeviceSubscription(),
  });

  public readonly settings: Signal<ReminderSettings | null> = computed(() =>
    this.settingsResource.hasValue() ? (this.settingsResource.value() ?? null) : null,
  );
  public readonly deviceSubscription: Signal<DevicePushSubscription | null> = computed(() =>
    this.deviceSubscriptionResource.hasValue() ? (this.deviceSubscriptionResource.value() ?? null) : null,
  );
  // The device subscription starts loading only after the first client render, later than the settings.
  public readonly isFirstLoad: Signal<boolean> = computed(
    () =>
      this.authState.status() === 'unknown' ||
      (this.settingsResource.isLoading() && !this.settingsResource.hasValue()) ||
      (this.deviceSubscriptionResource.isLoading() && !this.deviceSubscriptionResource.hasValue()),
  );
  public readonly hasLoadError: Signal<boolean> = computed(() => Boolean(this.settingsResource.error() || this.deviceSubscriptionResource.error()));

  public override resetState(): void {
    this.settingsResource.set(null);
    this.deviceSubscriptionResource.set(null);
  }

  private loadDeviceSubscription(): Observable<DevicePushSubscription | null> {
    return this.devicePush
      .getSubscription()
      .pipe(
        switchMap((subscription: DevicePushSubscription | null) =>
          subscription
            ? this.remindersClient.hasDeviceSubscription(subscription.endpoint).pipe(map((isSaved: boolean) => (isSaved ? subscription : null)))
            : of(null),
        ),
      );
  }
}
