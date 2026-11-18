import { Body, Controller, Get, Header, HttpCode, HttpStatus, Logger, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GoogleSignInConfigDto } from '@birthday/shared-models';
import { SESSION_COOKIE, SIGN_IN_NONCE_COOKIE, SIGN_IN_NONCE_MS } from '../constants';
import { Public } from '../decorators';
import { GoogleSignInRejectedError } from '../errors';
import { googleCodeSignInSchema, googleCredentialSignInSchema } from '../schemas';
import { AuthUsersService, GoogleSignInService, SessionsService, SignInNonceSealer } from '../services';
import { GoogleProfile } from '../types';
import { readCookie, secureCookieOptions } from '../utils';

// Sign-in with Google Identity Services and sign-out. A successful sign-in answers 204 with the session cookie; data
// from Google that cannot sign anyone in answers 401.
@Public()
@Controller('auth')
export class AuthController {
  private readonly logger: Logger = new Logger(AuthController.name);

  constructor(
    private readonly googleSignIn: GoogleSignInService,
    private readonly nonceSealer: SignInNonceSealer,
    private readonly authUsers: AuthUsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  // The nonce stays the same while its cookie is valid, so several tabs of one browser share it.
  @Get('google/config')
  @Header('Cache-Control', 'no-store')
  public async getGoogleConfig(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<GoogleSignInConfigDto> {
    const nonce = (await this.nonceSealer.open(readCookie(request, SIGN_IN_NONCE_COOKIE))) ?? this.nonceSealer.createNonce();

    response.cookie(SIGN_IN_NONCE_COOKIE, await this.nonceSealer.seal(nonce), secureCookieOptions(SIGN_IN_NONCE_MS));
    return { clientId: this.googleSignIn.clientId, nonce };
  }

  // The authorization code from the sign-in popup.
  @Post('google/code')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async signInWithGoogleCode(@Body() body: unknown, @Res({ passthrough: true }) response: Response): Promise<void> {
    const { code } = googleCodeSignInSchema.parse(body);

    await this.startSession(response, await this.rejectAsUnauthorized(this.googleSignIn.signInWithCode(code)));
  }

  // The ID token from One Tap. It must carry the nonce that this browser got from `google/config`.
  @Post('google/credential')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async signInWithGoogleCredential(
    @Req() request: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const { credential } = googleCredentialSignInSchema.parse(body);
    const nonce = await this.nonceSealer.open(readCookie(request, SIGN_IN_NONCE_COOKIE));

    if (!nonce) {
      throw new UnauthorizedException();
    }

    const profile = await this.rejectAsUnauthorized(this.googleSignIn.signInWithCredential(credential, nonce));

    // The nonce is used up; the next One Tap gets a new one.
    response.clearCookie(SIGN_IN_NONCE_COOKIE, secureCookieOptions());
    await this.startSession(response, profile);
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

  private async startSession(response: Response, profile: GoogleProfile): Promise<void> {
    const user = await this.authUsers.upsertGoogleUser(profile);
    const session = await this.sessionsService.create(user.id);

    response.cookie(SESSION_COOKIE, session.token, secureCookieOptions(session.expiresAt.getTime() - Date.now()));
  }

  private async rejectAsUnauthorized(signIn: Promise<GoogleProfile>): Promise<GoogleProfile> {
    try {
      return await signIn;
    } catch (error) {
      if (error instanceof GoogleSignInRejectedError) {
        this.logger.warn({ err: error }, 'A Google sign-in was rejected');
        throw new UnauthorizedException();
      }
      throw error;
    }
  }
}
