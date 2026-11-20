import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { BirthdayDto, InviteSubmissionDto } from '@birthday/shared-models';
import { AuthUser, CurrentUser } from '@birthday/api-auth';
import { InviteSubmissionsService } from '../services';

// Birthdays guests sent to the signed-in user, waiting to be added or rejected.
@Controller('invites/submissions')
export class InviteSubmissionsController {
  constructor(private readonly inviteSubmissionsService: InviteSubmissionsService) {}

  @Get()
  public list(@CurrentUser() user: AuthUser): Promise<InviteSubmissionDto[]> {
    return this.inviteSubmissionsService.list(user.id);
  }

  @Post(':id/approve')
  public approve(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<BirthdayDto> {
    return this.inviteSubmissionsService.approve(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public reject(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.inviteSubmissionsService.reject(user.id, id);
  }
}
