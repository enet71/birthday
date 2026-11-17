import type { Mock } from 'vitest';
import { DOCUMENT, Location } from '@angular/common';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UserDto } from '@birthday/shared-models';
import { Environment, ENVIRONMENT_TOKEN } from '@birthday/web-shared-util';
import { AuthUser } from '../types';
import { AuthApiService } from './auth-api.service';

const BASE_URL = 'https://birthdly.example';
const ME_URL = `${BASE_URL}/api/me`;
const USER_DTO: UserDto = { id: 'user-1', email: 'user@example.com', name: 'User' };
const USER: AuthUser = { id: 'user-1', email: 'user@example.com' };

interface FakeDocument {
  location: { href: string; pathname: string; search: string; assign: Mock<(url: string) => void> };
}

describe('AuthApiService', () => {
  let service: AuthApiService;
  let http: HttpTestingController;
  let document: FakeDocument;
  const location: { replaceState: Mock<Location['replaceState']>; getState: Mock<Location['getState']> } = {
    replaceState: vi.fn(),
    getState: vi.fn(),
  };

  function setUp(platformId: 'browser' | 'server', href = `${BASE_URL}/people`): void {
    const url = new URL(href);
    document = { location: { href, pathname: url.pathname, search: url.search, assign: vi.fn() } };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: DOCUMENT, useValue: document },
        { provide: Location, useValue: location },
        { provide: ENVIRONMENT_TOKEN, useValue: { baseUrl: BASE_URL } as Environment },
      ],
    });
    service = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  }

  function respondWithStatus(status: number): void {
    http.expectOne(ME_URL).flush(null, { status, statusText: 'Error' });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    location.getState.mockReturnValue({ navigationId: 1 });
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  describe('userChanges', () => {
    it('emits the signed-in user from /api/me', () => {
      setUp('browser');
      const emitted: Mock<(user: AuthUser | null) => void> = vi.fn();

      service.userChanges().subscribe(emitted);
      http.expectOne({ method: 'GET', url: ME_URL }).flush(USER_DTO);

      expect(emitted).toHaveBeenCalledExactlyOnceWith(USER);
    });

    it('emits null when nobody is signed in', () => {
      setUp('browser');
      const emitted: Mock<(user: AuthUser | null) => void> = vi.fn();

      service.userChanges().subscribe(emitted);
      respondWithStatus(401);

      expect(emitted).toHaveBeenCalledExactlyOnceWith(null);
    });

    it('retries a server error after 1, 3 and 10 seconds and emits the user once it answers', () => {
      vi.useFakeTimers();
      setUp('browser');
      const emitted: Mock<(user: AuthUser | null) => void> = vi.fn();
      service.userChanges().subscribe(emitted);

      respondWithStatus(503);
      vi.advanceTimersByTime(999);
      http.expectNone(ME_URL);
      vi.advanceTimersByTime(1);
      respondWithStatus(500);
      vi.advanceTimersByTime(3000);
      http.expectOne(ME_URL).error(new ProgressEvent('error'));
      vi.advanceTimersByTime(9999);
      http.expectNone(ME_URL);
      vi.advanceTimersByTime(1);
      http.expectOne(ME_URL).flush(USER_DTO);

      expect(emitted).toHaveBeenCalledExactlyOnceWith(USER);
    });

    it('fails after the third retry', () => {
      vi.useFakeTimers();
      setUp('browser');
      const failed: Mock<(error: unknown) => void> = vi.fn();
      service.userChanges().subscribe({ error: failed });

      respondWithStatus(503);
      vi.advanceTimersByTime(1000);
      respondWithStatus(503);
      vi.advanceTimersByTime(3000);
      respondWithStatus(503);
      vi.advanceTimersByTime(10000);
      respondWithStatus(503);

      expect(failed).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ status: 503 }));
    });

    it('fails on a client error without retrying', () => {
      vi.useFakeTimers();
      setUp('browser');
      const failed: Mock<(error: unknown) => void> = vi.fn();
      service.userChanges().subscribe({ error: failed });

      respondWithStatus(404);
      vi.advanceTimersByTime(20000);

      http.expectNone(ME_URL);
      expect(failed).toHaveBeenCalledExactlyOnceWith(expect.any(HttpErrorResponse));
      expect((failed.mock.calls[0][0] as HttpErrorResponse).status).toBe(404);
    });

    it('emits null on the server without a request', () => {
      setUp('server');
      const emitted: Mock<(user: AuthUser | null) => void> = vi.fn();

      service.userChanges().subscribe(emitted);

      http.expectNone(ME_URL);
      expect(emitted).toHaveBeenCalledExactlyOnceWith(null);
    });
  });

  describe('signOut', () => {
    it('ends the session and then emits null to the user subscribers', () => {
      setUp('browser');
      const emitted: Mock<(user: AuthUser | null) => void> = vi.fn();
      const signedOut: Mock<() => void> = vi.fn();
      service.userChanges().subscribe(emitted);
      http.expectOne(ME_URL).flush(USER_DTO);

      service.signOut().subscribe({ complete: signedOut });
      const request = http.expectOne({ method: 'POST', url: `${BASE_URL}/api/auth/sign-out` });

      expect(emitted).toHaveBeenCalledTimes(1);

      request.flush(null, { status: 204, statusText: 'No Content' });

      expect(emitted).toHaveBeenLastCalledWith(null);
      expect(emitted).toHaveBeenCalledTimes(2);
      expect(signedOut).toHaveBeenCalled();
    });

    it('keeps the user when the sign-out fails', () => {
      setUp('browser');
      const emitted: Mock<(user: AuthUser | null) => void> = vi.fn();
      const failed: Mock<(error: unknown) => void> = vi.fn();
      service.userChanges().subscribe(emitted);
      http.expectOne(ME_URL).flush(USER_DTO);

      service.signOut().subscribe({ error: failed });
      http.expectOne(`${BASE_URL}/api/auth/sign-out`).flush(null, { status: 403, statusText: 'Forbidden' });

      expect(emitted).toHaveBeenCalledExactlyOnceWith(USER);
      expect(failed).toHaveBeenCalled();
    });
  });

  describe('completeSignIn', () => {
    it('completes when the page was not opened from a failed sign-in', () => {
      setUp('browser', `${BASE_URL}/people?x=1`);
      const completed: Mock<() => void> = vi.fn();
      const failed: Mock<(error: unknown) => void> = vi.fn();

      service.completeSignIn().subscribe({ complete: completed, error: failed });

      expect(completed).toHaveBeenCalled();
      expect(failed).not.toHaveBeenCalled();
      expect(location.replaceState).not.toHaveBeenCalled();
    });

    it('fails and removes only the sign-in result from the address after a failed sign-in', () => {
      setUp('browser', `${BASE_URL}/people?x=1&signIn=failed&y=2`);
      const failed: Mock<(error: unknown) => void> = vi.fn();

      service.completeSignIn().subscribe({ error: failed });

      expect(failed).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
      expect(location.replaceState).toHaveBeenCalledExactlyOnceWith('/people', 'x=1&y=2', { navigationId: 1 });
    });

    it('completes on the server even with a failed sign-in in the address', () => {
      setUp('server', `${BASE_URL}/people?signIn=failed`);
      const completed: Mock<() => void> = vi.fn();

      service.completeSignIn().subscribe({ complete: completed });

      expect(completed).toHaveBeenCalled();
      expect(location.replaceState).not.toHaveBeenCalled();
    });
  });

  describe('signInWithGoogle', () => {
    it('sends the browser to the API with the current path and query to return to', () => {
      setUp('browser', `${BASE_URL}/people/1?x=1&y=a b`);
      const completed: Mock<() => void> = vi.fn();

      service.signInWithGoogle().subscribe({ complete: completed });

      expect(document.location.assign).toHaveBeenCalledExactlyOnceWith(
        `${BASE_URL}/api/auth/google/start?returnTo=${encodeURIComponent('/people/1?x=1&y=a%20b')}`,
      );
      expect(completed).toHaveBeenCalled();
    });

    it('does not leave the page before it is subscribed', () => {
      setUp('browser');

      service.signInWithGoogle();

      expect(document.location.assign).not.toHaveBeenCalled();
    });
  });
});
