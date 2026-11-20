import { CanActivate, ExecutionContext, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_OPTIONS_TOKEN } from '../auth.module-definition';
import { AuthenticatedRequest, AuthModuleOptions } from '../types';
import { isAdminOnly } from '../utils';

// Lets only admins reach `@AdminOnly()` endpoints. Runs after `AuthGuard`, which has already rejected signed-out users.
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminEmails: Set<string>;

  constructor(
    private readonly reflector: Reflector,
    @Inject(MODULE_OPTIONS_TOKEN) options: AuthModuleOptions,
  ) {
    this.adminEmails = new Set(options.adminEmails.map((email: string) => email.toLowerCase()));
  }

  public canActivate(context: ExecutionContext): boolean {
    if (!isAdminOnly(this.reflector, context)) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Partial<AuthenticatedRequest>>();

    if (!user || !this.adminEmails.has(user.email.toLowerCase())) {
      throw new NotFoundException();
    }

    return true;
  }
}
