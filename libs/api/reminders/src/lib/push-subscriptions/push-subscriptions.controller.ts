import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { PushSubscriptionLookupResponse } from '@birthday/shared-models';
import { AuthUser, CurrentUser } from '@birthday/api-auth';
import { pushSubscriptionEndpointSchema, pushSubscriptionSchema } from '../schemas';
import { PushSubscriptionsService } from './push-subscriptions.service';

// The endpoint addresses a device, so it travels only in request bodies, which are not logged, never in the URL.
@Controller('push-subscriptions')
export class PushSubscriptionsController {
  constructor(private readonly subscriptionsService: PushSubscriptionsService) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  public save(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<void> {
    return this.subscriptionsService.save(user.id, pushSubscriptionSchema.parse(body));
  }

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  public async lookup(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<PushSubscriptionLookupResponse> {
    return { exists: await this.subscriptionsService.exists(user.id, pushSubscriptionEndpointSchema.parse(body).endpoint) };
  }

  // Answers 204 also when the device was not subscribed.
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  public delete(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<void> {
    return this.subscriptionsService.delete(user.id, pushSubscriptionEndpointSchema.parse(body).endpoint);
  }
}
