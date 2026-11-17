import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { MODULE_OPTIONS_TOKEN } from '../auth.module-definition';
import { AuthModuleOptions } from '../types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Protects against cross-site request forgery: a request that changes something must come from the web app's own
// pages. Browsers send `Origin` with every such request and a page cannot forge it; SameSite=Lax cookies are a second
// line of defence. Clients that are not browsers must send the app's origin too.
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private readonly options: AuthModuleOptions) {}

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method) || request.headers.origin === this.options.appOrigin) {
      return true;
    }

    throw new ForbiddenException();
  }
}
