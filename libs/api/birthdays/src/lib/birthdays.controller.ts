import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { BirthdayDto } from '@birthday/shared-models';
import { AuthUser, CurrentUser } from '@birthday/api-auth';
import { BirthdaysService } from './birthdays.service';
import { createBirthdaySchema, updateBirthdaySchema } from './schemas';

// The signed-in user's birthdays. Invalid bodies fail zod parsing; the API answers that with 400.
@Controller('birthdays')
export class BirthdaysController {
  constructor(private readonly birthdaysService: BirthdaysService) {}

  @Get()
  public list(@CurrentUser() user: AuthUser): Promise<BirthdayDto[]> {
    return this.birthdaysService.list(user.id);
  }

  @Post()
  public create(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<BirthdayDto> {
    return this.birthdaysService.create(user.id, createBirthdaySchema.parse(body));
  }

  @Patch(':id')
  public update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: unknown): Promise<BirthdayDto> {
    return this.birthdaysService.update(user.id, id, updateBirthdaySchema.parse(body));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public delete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.birthdaysService.delete(user.id, id);
  }
}
