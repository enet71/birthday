import type { Mock } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SESSION_COOKIE } from '../constants';
import { Public } from '../decorators';
import { SessionsService } from '../services';
import { AuthUser } from '../types';
import { AuthGuard } from './auth.guard';

const USER: AuthUser = { id: 'user-1', email: 'user@example.com', name: 'User' };
const NOW = new Date('2026-11-17T10:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const SECURE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

class PrivateController {
  public handle(): void {
    return undefined;
  }

  @Public()
  public publicHandle(): void {
    return undefined;
  }
}

@Public()
class PublicController {
  public handle(): void {
    return undefined;
  }
}

interface FakeRequest {
  headers: { cookie?: string };
  user?: AuthUser;
}

interface FakeResponse {
  cookie: Mock;
  clearCookie: Mock;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let request: FakeRequest;
  let response: FakeResponse;
  const sessionsService: { authenticate: Mock<SessionsService['authenticate']> } = { authenticate: vi.fn() };

  function createContext(controller: object, handler: string): ExecutionContext {
    return {
      getClass: () => controller,
      getHandler: () => (controller as { prototype: Record<string, unknown> }).prototype[handler],
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ExecutionContext;
  }

  const privateContext = (): ExecutionContext => createContext(PrivateController, 'handle');

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    request = { headers: {} };
    response = { cookie: vi.fn(), clearCookie: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [AuthGuard, Reflector, { provide: SessionsService, useValue: sessionsService }],
    }).compile();

    guard = moduleRef.get(AuthGuard);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets a request to a public handler through without a session', async () => {
    expect(await guard.canActivate(createContext(PrivateController, 'publicHandle'))).toBe(true);
    expect(sessionsService.authenticate).not.toHaveBeenCalled();
  });

  it('lets a request to a handler of a public controller through without a session', async () => {
    expect(await guard.canActivate(createContext(PublicController, 'handle'))).toBe(true);
    expect(sessionsService.authenticate).not.toHaveBeenCalled();
  });

  it('rejects a request without a session cookie and leaves the cookies alone', async () => {
    request.headers.cookie = 'other=value';

    await expect(guard.canActivate(privateContext())).rejects.toThrow(UnauthorizedException);
    expect(sessionsService.authenticate).not.toHaveBeenCalled();
    expect(response.clearCookie).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('rejects an unknown or ended session and clears its cookie', async () => {
    request.headers.cookie = `${SESSION_COOKIE}=token-1`;
    sessionsService.authenticate.mockResolvedValue(null);

    await expect(guard.canActivate(privateContext())).rejects.toThrow(UnauthorizedException);
    expect(sessionsService.authenticate).toHaveBeenCalledWith('token-1');
    expect(response.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE, SECURE_OPTIONS);
    expect(request.user).toBeUndefined();
  });

  it('sets the user of a valid session without writing the cookie', async () => {
    request.headers.cookie = `${SESSION_COOKIE}=token-1`;
    sessionsService.authenticate.mockResolvedValue({ user: USER, expiresAt: new Date(NOW.getTime() + 29 * DAY_MS), extended: false });

    expect(await guard.canActivate(privateContext())).toBe(true);
    expect(request.user).toBe(USER);
    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.clearCookie).not.toHaveBeenCalled();
  });

  it('sends the cookie again with the new expiry when the session was extended', async () => {
    request.headers.cookie = `${SESSION_COOKIE}=token-1`;
    sessionsService.authenticate.mockResolvedValue({ user: USER, expiresAt: new Date(NOW.getTime() + 30 * DAY_MS), extended: true });

    expect(await guard.canActivate(privateContext())).toBe(true);
    expect(request.user).toBe(USER);
    expect(response.cookie).toHaveBeenCalledWith(SESSION_COOKIE, 'token-1', { ...SECURE_OPTIONS, maxAge: 30 * DAY_MS });
  });
});
