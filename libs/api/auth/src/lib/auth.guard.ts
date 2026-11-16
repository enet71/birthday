import { CanActivate, ExecutionContext, Inject, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { errors, JWTPayload, jwtVerify, JWTVerifyGetKey } from 'jose';
import { MODULE_OPTIONS_TOKEN } from './auth.module-definition';
import { KeySetUnavailableError } from './supabase-key-set';
import { AUTHENTICATED_ROLE, IS_PUBLIC_KEY, JWT_KEY_SET, SUPABASE_JWT_ALGORITHM } from './constants';
import { AuthenticatedRequest, AuthModuleOptions, AuthUser } from './types';
import { extractBearerToken, getSupabaseAuthUrl } from './utils';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger: Logger = new Logger(AuthGuard.name);
  private readonly issuer: string;

  constructor(
    private readonly reflector: Reflector,
    @Inject(JWT_KEY_SET) private readonly keySet: JWTVerifyGetKey,
    @Inject(MODULE_OPTIONS_TOKEN) options: AuthModuleOptions,
  ) {
    this.issuer = getSupabaseAuthUrl(options.supabaseUrl);
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw this.reject('The request has no bearer token');
    }

    request.user = this.toUser(await this.verify(token));
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]) === true;
  }

  private async verify(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.keySet, {
        issuer: this.issuer,
        audience: AUTHENTICATED_ROLE,
        algorithms: [SUPABASE_JWT_ALGORITHM],
        requiredClaims: ['sub', 'exp'],
      });

      return payload;
    } catch (error) {
      // The token may be valid, so the client must not take the answer for a sign-out. Any other error is unexpected.
      if (error instanceof KeySetUnavailableError || !(error instanceof errors.JOSEError)) {
        this.logger.error({ err: error }, 'Loading the Supabase signing keys failed');
        throw new ServiceUnavailableException();
      }

      throw this.reject(`The access token is invalid: ${error.code}`);
    }
  }

  private toUser(payload: JWTPayload): AuthUser {
    // Only signed-in users: `anon` and `service_role` tokens do not belong to a user.
    if (payload['role'] !== AUTHENTICATED_ROLE || !payload.sub) {
      throw this.reject(`The access token has the role ${String(payload['role'])}`);
    }

    return { id: payload.sub, email: typeof payload['email'] === 'string' ? payload['email'] : null };
  }

  // The reason is logged, not returned, so a client cannot probe which check failed.
  private reject(reason: string): UnauthorizedException {
    this.logger.debug(reason);
    return new UnauthorizedException();
  }
}
