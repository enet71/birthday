import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { GoogleCalendarCompleteResponse, GoogleCalendarConnectionDto, GoogleCalendarSyncResponse } from '@birthday/shared-models';
import { AuthUser, CurrentUser } from '@birthday/api-auth';
import { completeSchema, disconnectSchema, syncSchema } from './schemas';
import { GoogleCalendarService } from './services';

// The signed-in user's Google Calendar connection. Invalid bodies fail zod parsing; the API answers that with 400.
@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('connection')
  public getConnection(@CurrentUser() user: AuthUser): Promise<GoogleCalendarConnectionDto | null> {
    return this.googleCalendarService.getConnection(user.id);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  public complete(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<GoogleCalendarCompleteResponse> {
    return this.googleCalendarService.complete(user.id, completeSchema.parse(body));
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  public sync(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<GoogleCalendarSyncResponse> {
    return this.googleCalendarService.sync(user.id, syncSchema.parse(body).manual);
  }

  @Delete('connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  public disconnect(@CurrentUser() user: AuthUser, @Query() query: unknown): Promise<void> {
    return this.googleCalendarService.disconnect(user.id, disconnectSchema.parse(query).removeEvents);
  }
}
