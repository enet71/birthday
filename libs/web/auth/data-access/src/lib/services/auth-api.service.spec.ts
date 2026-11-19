import type { Mock } from 'vitest';
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
const USER_DTO: UserDto = { id: 'user-1', email: 'user@example.com', name: 'User', picture: null };
const USER: AuthUser = { id: 'user-1', email: 'user@example.com', picture: null };

describe('AuthApiService', () => {
  let service: AuthApiService;
  let http: HttpTestingController;

  function setUp(platformId: 'browser' | 'server'): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: ENVIRONMENT_TOKEN, useValue: { baseUrl: BASE_URL } as Environment },
      ],
    });
    service = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  }

  function respondWithStatus(status: number): void {
    http.expectOne(ME_URL).flush(null, { status, statusText: 'Error' });
  }

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
});
