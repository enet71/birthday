import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DevicePushSubscriptionDto } from '@birthday/shared-models';
import { DATABASE, Database, pushSubscriptions } from '@birthday/api-database';

// The devices that get the user's notifications; every query is limited to the signed-in user.
@Injectable()
export class PushSubscriptionsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // The browser may renew the keys of an endpoint, so saving it again replaces them.
  public async save(userId: string, subscription: DevicePushSubscriptionDto): Promise<void> {
    await this.db
      .insert(pushSubscriptions)
      .values({ userId, endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth })
      .onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
        set: { p256dh: subscription.p256dh, auth: subscription.auth },
      });
  }

  public async exists(userId: string, endpoint: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
      .limit(1);

    return row !== undefined;
  }

  public async delete(userId: string, endpoint: string): Promise<void> {
    await this.db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  }
}
