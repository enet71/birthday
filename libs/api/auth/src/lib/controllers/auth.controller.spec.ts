import type { Mock } from 'vitest';
import { HttpStatus, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { MODULE_OPTIONS_TOKEN } from '../auth.module-definition';
import { SESSION_COOKIE, SIGN_IN_FLOW_COOKIE } from '../constants';
import { AuthUsersService, GoogleOidcService, SessionsService, SignInFlowSealer } from '../services';
import { AuthModuleOptions, AuthUser, GoogleProfile, SignInFlow } from '../types';
import { AuthController } from './auth.controller';

const APP_ORIGIN = 'https://birthdly.example';
const NOW = new Date('2026-11-17T10:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const SECURE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
const FLOW: SignInFlow = { state: 'state-1', nonce: 'nonce-1', codeVerifier: 'verifier-1', returnTo: '/people?x=1' };
const PROFILE: GoogleProfile = { sub: 'google-1', email: 'user@example.com', name: 'User' };
const USER: AuthUser = { id: 'user-1', email: 'user@example.com', name: 'User' };
const CALLBACK_PATH = '/api/auth/google/callback?code=code-1&state=state-1';

interface FakeResponse {
  cookie: Mock;
  clearCookie: Mock;
  redirect: Mock;
}

function createRequest(cookie?: string): Request {
  return { headers: cookie === undefined ? {} : { cookie }, originalUrl: CALLBACK_PATH } as Request;
}

describe('AuthController', () => {
  let controller: AuthController;
  let response: FakeResponse;
  const googleOidc: {
    createFlow: Mock<GoogleOidcService['createFlow']>;
    createAuthorizationUrl: Mock<GoogleOidcService['createAuthorizationUrl']>;
    completeSignIn: Mock<GoogleOidcService['completeSignIn']>;
  } = { createFlow: vi.fn(), createAuthorizationUrl: vi.fn(), completeSignIn: vi.fn() };
  const flowSealer: { seal: Mock<SignInFlowSealer['seal']>; open: Mock<SignInFlowSealer['open']> } = {
    seal: vi.fn(),
    open: vi.fn(),
  };
  const authUsers: { upsertGoogleUser: Mock<AuthUsersService['upsertGoogleUser']> } = { upsertGoogleUser: vi.fn() };
  const sessionsService: { create: Mock<SessionsService['create']>; delete: Mock<SessionsService['delete']> } = {
    create: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    response = { cookie: vi.fn(), clearCookie: vi.fn(), redirect: vi.fn() };
    googleOidc.createFlow.mockImplementation((returnTo: string) => ({ ...FLOW, returnTo }));
    googleOidc.createAuthorizationUrl.mockResolvedValue(new URL('https://accounts.google.com/o/oauth2/v2/auth?client_id=1'));
    flowSealer.seal.mockResolvedValue('sealed-flow');
    flowSealer.open.mockResolvedValue(FLOW);
    googleOidc.completeSignIn.mockResolvedValue(PROFILE);
    authUsers.upsertGoogleUser.mockResolvedValue(USER);
    sessionsService.create.mockResolvedValue({ token: 'session-token', expiresAt: new Date(NOW.getTime() + 30 * DAY_MS) });
    sessionsService.delete.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: MODULE_OPTIONS_TOKEN, useValue: { appOrigin: APP_ORIGIN } as AuthModuleOptions },
        { provide: GoogleOidcService, useValue: googleOidc },
        { provide: SignInFlowSealer, useValue: flowSealer },
        { provide: AuthUsersService, useValue: authUsers },
        { provide: SessionsService, useValue: sessionsService },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('startGoogleSignIn', () => {
    it('remembers the flow in a cookie for 10 minutes and sends the browser to Google', async () => {
      await controller.startGoogleSignIn('/people?x=1', response as unknown as Response);

      expect(googleOidc.createFlow).toHaveBeenCalledWith('/people?x=1');
      expect(flowSealer.seal).toHaveBeenCalledWith({ ...FLOW, returnTo: '/people?x=1' });
      expect(response.cookie).toHaveBeenCalledWith(SIGN_IN_FLOW_COOKIE, 'sealed-flow', { ...SECURE_OPTIONS, maxAge: 600_000 });
      expect(response.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, 'https://accounts.google.com/o/oauth2/v2/auth?client_id=1');
    });

    it.each([['//evil.example'], ['https://evil.example'], [undefined], [['/a', '/b']]])(
      'starts the flow with "/" for the unsafe return path %j',
      async (returnTo: unknown) => {
        await controller.startGoogleSignIn(returnTo, response as unknown as Response);

        expect(googleOidc.createFlow).toHaveBeenCalledWith('/');
      },
    );

    it('returns to the page marked as failed without a cookie when Google cannot be reached', async () => {
      googleOidc.createAuthorizationUrl.mockRejectedValue(new Error('discovery failed'));

      await controller.startGoogleSignIn('/people?x=1', response as unknown as Response);

      expect(response.cookie).not.toHaveBeenCalled();
      expect(response.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, '/people?x=1&signIn=failed');
    });
  });

  describe('completeGoogleSignIn', () => {
    it.each([
      ['without a flow cookie', undefined],
      ['with an invalid flow cookie', `${SIGN_IN_FLOW_COOKIE}=broken`],
    ])('clears the flow cookie and returns home marked as failed %s', async (_case: string, cookie: string | undefined) => {
      flowSealer.open.mockResolvedValue(null);

      await controller.completeGoogleSignIn(createRequest(cookie), response as unknown as Response);

      expect(response.clearCookie).toHaveBeenCalledWith(SIGN_IN_FLOW_COOKIE, SECURE_OPTIONS);
      expect(response.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, '/?signIn=failed');
      expect(googleOidc.completeSignIn).not.toHaveBeenCalled();
      expect(response.cookie).not.toHaveBeenCalled();
    });

    it('passes the flow cookie value to the sealer', async () => {
      await controller.completeGoogleSignIn(createRequest(`${SIGN_IN_FLOW_COOKIE}=sealed-flow`), response as unknown as Response);

      expect(flowSealer.open).toHaveBeenCalledWith('sealed-flow');
    });

    it('signs the user in and returns to the page where the sign-in started', async () => {
      await controller.completeGoogleSignIn(createRequest(`${SIGN_IN_FLOW_COOKIE}=sealed-flow`), response as unknown as Response);

      expect(googleOidc.completeSignIn).toHaveBeenCalledWith(new URL(CALLBACK_PATH, APP_ORIGIN), FLOW);
      expect(authUsers.upsertGoogleUser).toHaveBeenCalledWith(PROFILE);
      expect(sessionsService.create).toHaveBeenCalledWith('user-1');
      expect(response.clearCookie).toHaveBeenCalledWith(SIGN_IN_FLOW_COOKIE, SECURE_OPTIONS);
      expect(response.cookie).toHaveBeenCalledWith(SESSION_COOKIE, 'session-token', { ...SECURE_OPTIONS, maxAge: 30 * DAY_MS });
      expect(response.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, '/people?x=1');
    });

    it('returns to the page marked as failed without a session when Google rejects the sign-in', async () => {
      googleOidc.completeSignIn.mockRejectedValue(new Error('access_denied'));

      await controller.completeGoogleSignIn(createRequest(`${SIGN_IN_FLOW_COOKIE}=sealed-flow`), response as unknown as Response);

      expect(authUsers.upsertGoogleUser).not.toHaveBeenCalled();
      expect(sessionsService.create).not.toHaveBeenCalled();
      expect(response.cookie).not.toHaveBeenCalled();
      expect(response.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, '/people?x=1&signIn=failed');
    });

    it('returns to the page marked as failed when the session cannot be created', async () => {
      sessionsService.create.mockRejectedValue(new Error('database down'));

      await controller.completeGoogleSignIn(createRequest(`${SIGN_IN_FLOW_COOKIE}=sealed-flow`), response as unknown as Response);

      expect(response.cookie).not.toHaveBeenCalled();
      expect(response.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, '/people?x=1&signIn=failed');
    });
  });

  describe('signOut', () => {
    it('ends the session of the cookie and clears the cookie', async () => {
      await controller.signOut(createRequest(`${SESSION_COOKIE}=session-token`), response as unknown as Response);

      expect(sessionsService.delete).toHaveBeenCalledWith('session-token');
      expect(response.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE, SECURE_OPTIONS);
    });

    it('only clears the cookie when the browser has no session', async () => {
      await controller.signOut(createRequest(), response as unknown as Response);

      expect(sessionsService.delete).not.toHaveBeenCalled();
      expect(response.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE, SECURE_OPTIONS);
    });
  });
});
