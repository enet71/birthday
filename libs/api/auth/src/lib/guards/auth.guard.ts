import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { IS_PUBLIC_KEY, SESSION_COOKIE } from '../constants';
import { SessionsService } from '../services';
import { AuthenticatedRequest } from '../types';
import { isAdminOnly, readCookie, secureCookieOptions } from '../utils';

// Requires a signed-in user on every endpoint that is not `@Public()`.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionsService: SessionsService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const token = readCookie(request, SESSION_COOKIE);
    const session = token ? await this.sessionsService.authenticate(token) : null;

    if (!session) {
      // An ended or unknown session is of no further use to the browser.
      if (token) {
        response.clearCookie(SESSION_COOKIE, secureCookieOptions());
      }
      // An admin endpoint does not reveal itself to signed-out visitors either.
      throw isAdminOnly(this.reflector, context) ? new NotFoundException() : new UnauthorizedException();
    }
    if (session.extended) {
      response.cookie(SESSION_COOKIE, token, secureCookieOptions(session.expiresAt.getTime() - Date.now()));
    }

    request.user = session.user;
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]) === true;
  }
}
