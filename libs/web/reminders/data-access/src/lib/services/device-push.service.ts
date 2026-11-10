import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SwPush } from '@angular/service-worker';
import { defer, map, Observable, of, switchMap, timeout } from 'rxjs';
import { SERVICE_WORKER_READY_TIMEOUT } from '../constants';
import { DevicePushSubscription, PushSupport } from '../types';

// This browser's push subscription. It reads the subscription from the service worker registration rather than from
// `SwPush.subscription`, which waits until the worker controls the page and so never emits after a hard reload.
@Injectable({ providedIn: 'root' })
export class DevicePushService {
  private readonly swPush: SwPush = inject(SwPush);
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

  public getSupport(): PushSupport {
    if (this.isIos() && !this.isInstalled()) {
      return 'iosNotInstalled';
    }

    // `SwPush.isEnabled` is false when the app does not register its service worker, for example in development.
    return this.isBrowser && this.swPush.isEnabled && 'PushManager' in window && 'Notification' in window ? 'supported' : 'unsupported';
  }

  // `null` where the browser has no notifications.
  public getPermission(): NotificationPermission | null {
    return this.isBrowser && 'Notification' in window ? Notification.permission : null;
  }

  public getSubscription(): Observable<DevicePushSubscription | null> {
    return this.getRegistration().pipe(
      switchMap((registration: ServiceWorkerRegistration) => registration.pushManager.getSubscription()),
      map((subscription: PushSubscription | null) => (subscription ? this.toDeviceSubscription(subscription) : null)),
    );
  }

  // Asks for permission first when the user has not answered yet; fails when the user blocks or dismisses the request.
  // Asking explicitly settles a dismissed request, while `pushManager.subscribe()` can keep waiting for an answer.
  public subscribe(applicationServerKey: string): Observable<DevicePushSubscription> {
    return defer(() => Notification.requestPermission()).pipe(
      switchMap((permission: NotificationPermission) => {
        if (permission !== 'granted') {
          throw new Error(`Notification permission is ${permission}`);
        }

        return this.getRegistration();
      }),
      switchMap((registration: ServiceWorkerRegistration) =>
        registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.decodeBase64Url(applicationServerKey) }),
      ),
      map((subscription: PushSubscription) => this.toDeviceSubscription(subscription)),
    );
  }

  // The push service then rejects messages to the old endpoint, and the backend deletes it.
  public unsubscribe(): Observable<void> {
    return this.getRegistration().pipe(
      switchMap((registration: ServiceWorkerRegistration) => registration.pushManager.getSubscription()),
      switchMap((subscription: PushSubscription | null) => (subscription ? subscription.unsubscribe() : of(false))),
      map(() => undefined),
    );
  }

  // `ready` never settles when the worker fails to register, so give up rather than wait forever.
  private getRegistration(): Observable<ServiceWorkerRegistration> {
    return defer(() => navigator.serviceWorker.ready).pipe(timeout(SERVICE_WORKER_READY_TIMEOUT));
  }

  private toDeviceSubscription(subscription: PushSubscription): DevicePushSubscription {
    const keys: Record<string, string> = subscription.toJSON().keys ?? {};

    return { endpoint: subscription.endpoint, p256dh: keys['p256dh'] ?? '', auth: keys['auth'] ?? '' };
  }

  private decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
    const base64: string = value.replace(/-/g, '+').replace(/_/g, '/');

    return Uint8Array.from(atob(base64), (char: string) => char.charCodeAt(0));
  }

  // iPadOS reports itself as a Mac, so a Mac with a touch screen counts too.
  private isIos(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  }

  private isInstalled(): boolean {
    return matchMedia('(display-mode: standalone)').matches;
  }
}
