import type { Mock } from 'vitest';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { SESSION_COOKIE } from '../constants';
import { AuthUsersService, GoogleSignInService, SessionsService, SignInNonceSealer } from '../services';
import { AuthController } from './auth.controller';

const SECURE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

interface FakeResponse {
  clearCookie: Mock;
}

function createRequest(cookie?: string): Request {
  return { headers: cookie === undefined ? {} : { cookie } } as Request;
}

describe('AuthController', () => {
  let controller: AuthController;
  let response: FakeResponse;
  const sessionsService: { delete: Mock<SessionsService['delete']> } = { delete: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    response = { clearCookie: vi.fn() };
    sessionsService.delete.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: GoogleSignInService, useValue: {} },
        { provide: SignInNonceSealer, useValue: {} },
        { provide: AuthUsersService, useValue: {} },
        { provide: SessionsService, useValue: sessionsService },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
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
