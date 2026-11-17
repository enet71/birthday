import { DOCUMENT, isPlatformBrowser, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { catchError, defer, map, merge, Observable, of, retry, Subject, tap, throwError, timer } from 'rxjs';
import { SIGN_IN_FAILED, SIGN_IN_RESULT_PARAM, UserDto } from '@birthday/shared-models';
import { ApiService } from '@birthday/web-shared-data-access';
import { AuthUser } from '../types';
import { AuthClient } from './auth.client';

// Sign-in through the API: Google signs the user in, and the API keeps the session in an HttpOnly cookie that scripts
// cannot read. The app learns who is signed in from `GET /api/me`.
@Injectable({ providedIn: 'root' })
export class AuthApiService extends ApiService implements AuthClient {
  private readonly document: Document = inject(DOCUMENT);
  private readonly location: Location = inject(Location);
  // The server renders pages without the visitor's cookies, so they render signed out, as before.
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly signedOut: Subject<void> = new Subject<void>();

  public userChanges(): Observable<AuthUser | null> {
    if (!this.isBrowser) {
      return of(null);
    }

    return merge(this.loadUser(), this.signedOut.pipe(map(() => null)));
  }

  // The API returns the browser to the page with `?signIn=failed` when Google sign-in did not complete.
  public completeSignIn(): Observable<void> {
    return defer(() => {
      if (!this.isBrowser) {
        return of(undefined);
      }

      const url = new URL(this.document.location.href);

      if (url.searchParams.get(SIGN_IN_RESULT_PARAM) !== SIGN_IN_FAILED) {
        return of(undefined);
      }

      // A reload must not report the failure again.
      url.searchParams.delete(SIGN_IN_RESULT_PARAM);
      this.location.replaceState(url.pathname, url.searchParams.toString(), this.location.getState());
      return throwError(() => new Error('The sign-in did not complete'));
    });
  }

  // Leaves the app; the API sends the browser to Google and back to this page.
  public signInWithGoogle(): Observable<void> {
    return defer(() => {
      const { pathname, search } = this.document.location;

      this.document.location.assign(`${this.baseUrl}/auth/google/start?returnTo=${encodeURIComponent(`${pathname}${search}`)}`);
      return of(undefined);
    });
  }

  public signOut(): Observable<void> {
    return this.httpClient.post<void>(`${this.baseUrl}/auth/sign-out`, null).pipe(tap(() => this.signedOut.next()));
  }

  private loadUser(): Observable<AuthUser | null> {
    return this.httpClient.get<UserDto>(`${this.baseUrl}/me`).pipe(
      // A deployment or a dropped connection fails the request for a moment; the user is then still signed in.
      retry({
        count: ME_RETRY_DELAYS_MS.length,
        delay: (error: unknown, attempt: number) => (isTransient(error) ? timer(ME_RETRY_DELAYS_MS[attempt - 1]) : throwError(() => error)),
      }),
      map((user: UserDto): AuthUser => ({ id: user.id, email: user.email })),
      // 401: nobody is signed in in this browser.
      catchError((error: unknown) => (error instanceof HttpErrorResponse && error.status === 401 ? of(null) : throwError(() => error))),
    );
  }
}

const ME_RETRY_DELAYS_MS = [1000, 3000, 10000];

// No response (status 0) or a server error; a 4xx answer is final.
function isTransient(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
}
