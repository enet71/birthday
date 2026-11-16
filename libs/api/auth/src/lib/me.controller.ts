import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from './decorators';
import { AuthUser } from './types';

@Controller('me')
export class MeController {
  @Get()
  public me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
