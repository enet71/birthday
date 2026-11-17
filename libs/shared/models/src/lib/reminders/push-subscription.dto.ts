// The push subscription the browser created for a device. The endpoint lets anyone holding it address the device, so
// requests carry it in the body, never in the URL.
export interface DevicePushSubscriptionDto {
  endpoint: string;
  p256dh: string;
  auth: string;
}
