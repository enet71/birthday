import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { InviteLinkDto, InviteLinkResponse } from '@birthday/shared-models';
import { AuthUser, CurrentUser } from '@birthday/api-auth';
import { saveInviteLinkSchema } from '../schemas';
import { InviteLinkService } from '../services';

// The signed-in user's invite link.
@Controller('invites/link')
export class InviteLinkController {
  constructor(private readonly inviteLinkService: InviteLinkService) {}

  @Get()
  public async get(@CurrentUser() user: AuthUser): Promise<InviteLinkResponse> {
    return { link: await this.inviteLinkService.get(user.id) };
  }

  @Put()
  public save(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<InviteLinkDto> {
    return this.inviteLinkService.save(user.id, saveInviteLinkSchema.parse(body));
  }

  // Replaces the token, so the old link stops working.
  @Post('token')
  public reissue(@CurrentUser() user: AuthUser): Promise<InviteLinkDto> {
    return this.inviteLinkService.reissue(user.id);
  }
}
