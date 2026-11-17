import { DevicePushSubscriptionDto } from './push-subscription.dto';

export type PushSubscriptionEndpointRequest = Pick<DevicePushSubscriptionDto, 'endpoint'>;
