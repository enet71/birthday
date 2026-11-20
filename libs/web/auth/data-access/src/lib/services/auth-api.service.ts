import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { catchError, map, merge, Observable, of, retry, Subject, switchMap, tap, throwError, timer } from 'rxjs';
import { GoogleCodeSignInRequest, GoogleCredentialSignInRequest, GoogleSignInConfigDto, UserDto } from '@birthday/shared-models';
import { ApiService } from '@birthday/web-shared-data-access';
import { AuthUser } from '../types';

// Sign-in through the API: the page gets a code or an ID token from Google, and the API keeps the session in an
// HttpOnly cookie that scripts cannot read. The app learns who is signed in from `GET /api/me`.
@Injectable({ providedIn: 'root' })
export class AuthApiService extends ApiService {
  // The server renders pages without the visitor's cookies, so they render signed out, as before.
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly userChanged: Subject<AuthUser | null> = new Subject<AuthUser | null>();

  // Emits the restored user (or `null`) first, then the user after every sign-in and sign-out.
  public userChanges(): Observable<AuthUser | null> {
    if (!this.isBrowser) {
      return of(null);
    }

    return merge(this.loadUser(), this.userChanged);
  }

  public getGoogleSignInConfig(): Observable<GoogleSignInConfigDto> {
    return this.httpClient.get<GoogleSignInConfigDto>(`${this.baseUrl}/auth/google/config`);
  }

  // The authorization code from the Google sign-in popup.
  public signInWithGoogleCode(code: string): Observable<void> {
    const body: GoogleCodeSignInRequest = { code };

    return this.signIn(this.httpClient.post<void>(`${this.baseUrl}/auth/google/code`, body));
  }

  // The ID token from One Tap.
  public signInWithGoogleCredential(credential: string): Observable<void> {
    const body: GoogleCredentialSignInRequest = { credential };

    return this.signIn(this.httpClient.post<void>(`${this.baseUrl}/auth/google/credential`, body));
  }

  public signOut(): Observable<void> {
    return this.httpClient.post<void>(`${this.baseUrl}/auth/sign-out`, null).pipe(tap(() => this.userChanged.next(null)));
  }

  // Completes once the signed-in user is known and passed on, so the view changes straight to signed in.
  private signIn(request: Observable<void>): Observable<void> {
    return request.pipe(
      switchMap(() => this.loadUser()),
      tap((user: AuthUser | null) => this.userChanged.next(user)),
      map(() => undefined),
    );
  }

  private loadUser(): Observable<AuthUser | null> {
    return this.httpClient.get<UserDto>(`${this.baseUrl}/me`).pipe(
      // A deployment or a dropped connection fails the request for a moment; the user is then still signed in.
      retry({
        count: ME_RETRY_DELAYS_MS.length,
        delay: (error: unknown, attempt: number) => (isTransient(error) ? timer(ME_RETRY_DELAYS_MS[attempt - 1]) : throwError(() => error)),
      }),
      map((user: UserDto): AuthUser => ({ id: user.id, email: user.email, name: user.name, picture: user.picture })),
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
