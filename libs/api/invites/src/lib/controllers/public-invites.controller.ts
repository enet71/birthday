import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PublicInviteDto } from '@birthday/shared-models';
import { Public } from '@birthday/api-auth';
import { createInviteSubmissionSchema } from '../schemas';
import { InviteLinkService, InviteSubmissionsService } from '../services';

// The guest side of an invite link; no sign-in. A disabled, reissued, or unknown token answers 404.
@Public()
@Controller('invites/public/:token')
export class PublicInvitesController {
  constructor(
    private readonly inviteLinkService: InviteLinkService,
    private readonly inviteSubmissionsService: InviteSubmissionsService,
  ) {}

  @Get()
  public get(@Param('token') token: string): Promise<PublicInviteDto> {
    return this.inviteLinkService.getPublic(token);
  }

  // 409 when the owner has too many pending submissions, 429 when this IP address sends too many.
  @Post('submissions')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public submit(@Param('token') token: string, @Body() body: unknown): Promise<void> {
    return this.inviteSubmissionsService.create(token, createInviteSubmissionSchema.parse(body));
  }
}
