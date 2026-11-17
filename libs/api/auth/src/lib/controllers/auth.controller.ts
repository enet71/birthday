import { Controller, Get, HttpCode, HttpStatus, Inject, Logger, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MODULE_OPTIONS_TOKEN } from '../auth.module-definition';
import { SESSION_COOKIE, SIGN_IN_FLOW_COOKIE, SIGN_IN_FLOW_MS } from '../constants';
import { Public } from '../decorators';
import { AuthUsersService, GoogleOidcService, SessionsService, SignInFlowSealer } from '../services';
import { AuthModuleOptions } from '../types';
import { readCookie, secureCookieOptions, toSafeReturnTo, withSignInFailed } from '../utils';

// Sign-in with Google and sign-out. The browser navigates to these endpoints; they answer with redirects, not JSON.
@Public()
@Controller('auth')
export class AuthController {
  private readonly logger: Logger = new Logger(AuthController.name);

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: AuthModuleOptions,
    private readonly googleOidc: GoogleOidcService,
    private readonly flowSealer: SignInFlowSealer,
    private readonly authUsers: AuthUsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  // Starts a sign-in: remembers the flow in an encrypted cookie and sends the browser to Google.
  @Get('google/start')
  public async startGoogleSignIn(@Query('returnTo') returnTo: unknown, @Res() response: Response): Promise<void> {
    const flow = this.googleOidc.createFlow(toSafeReturnTo(returnTo));

    try {
      const authorizationUrl = await this.googleOidc.createAuthorizationUrl(flow);

      response.cookie(SIGN_IN_FLOW_COOKIE, await this.flowSealer.seal(flow), secureCookieOptions(SIGN_IN_FLOW_MS));
      response.redirect(HttpStatus.FOUND, authorizationUrl.href);
    } catch (error) {
      this.logger.error({ err: error }, 'Starting a Google sign-in failed');
      response.redirect(HttpStatus.FOUND, withSignInFailed(flow.returnTo));
    }
  }

  // Google returns the browser here. On success the user gets a session cookie and goes back to the page where the
  // sign-in started; otherwise to the same page, marked so the web app reports the failure.
  @Get('google/callback')
  public async completeGoogleSignIn(@Req() request: Request, @Res() response: Response): Promise<void> {
    const flow = await this.flowSealer.open(readCookie(request, SIGN_IN_FLOW_COOKIE));

    response.clearCookie(SIGN_IN_FLOW_COOKIE, secureCookieOptions());
    if (!flow) {
      // Expired, or the callback was opened without starting a sign-in in this browser.
      response.redirect(HttpStatus.FOUND, withSignInFailed('/'));
      return;
    }

    try {
      // Google answers `error=access_denied` when the user cancels; openid-client rejects that as well.
      const profile = await this.googleOidc.completeSignIn(new URL(request.originalUrl, this.options.appOrigin), flow);
      const user = await this.authUsers.upsertGoogleUser(profile);
      const session = await this.sessionsService.create(user.id);

      response.cookie(SESSION_COOKIE, session.token, secureCookieOptions(session.expiresAt.getTime() - Date.now()));
      response.redirect(HttpStatus.FOUND, flow.returnTo);
    } catch (error) {
      this.logger.warn({ err: error }, 'A Google sign-in did not complete');
      response.redirect(HttpStatus.FOUND, withSignInFailed(flow.returnTo));
    }
  }

  // Ends the session of this browser. Answers 204 even without a session, so signing out is always possible.
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async signOut(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    const token = readCookie(request, SESSION_COOKIE);

    if (token) {
      await this.sessionsService.delete(token);
    }
    response.clearCookie(SESSION_COOKIE, secureCookieOptions());
  }
}
