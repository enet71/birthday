import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { BirthdaysModule } from '@birthday/api-birthdays';
import { SUBMISSION_THROTTLERS } from './constants';
import { InviteLinkController, InviteSubmissionsController, PublicInvitesController } from './controllers';
import { InviteLinkService, InviteSubmissionsService } from './services';

// The throttlers count requests in memory, which is enough for the single API instance. `ThrottlerModule` is global, so
// a `ThrottlerGuard` anywhere in the API uses these limits; give another endpoint its own with `@Throttle()`.
@Module({
  imports: [BirthdaysModule, ThrottlerModule.forRoot(SUBMISSION_THROTTLERS)],
  controllers: [InviteLinkController, InviteSubmissionsController, PublicInvitesController],
  providers: [InviteLinkService, InviteSubmissionsService],
})
export class InvitesModule {}
