import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { CelebrityImportsStatusResponse } from '@birthday/shared-models';
import { ApiService } from '@birthday/web-shared-data-access';

@Injectable({ providedIn: 'root' })
export class AdminApiService extends ApiService {
  // `null` when the user is not an admin: admin endpoints answer 404 to everyone else.
  public getCelebrityImportsStatus(): Observable<CelebrityImportsStatusResponse | null> {
    return this.httpClient
      .get<CelebrityImportsStatusResponse>(`${this.baseUrl}/admin/celebrity-imports`)
      .pipe(catchError((error: unknown) => (error instanceof HttpErrorResponse && error.status === 404 ? of(null) : throwError(() => error))));
  }
}
