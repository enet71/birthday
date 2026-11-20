import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CelebritiesRequest, CelebritiesResponse, toCelebritiesQueryParams } from '@birthday/shared-models';
import { ApiService } from '@birthday/web-shared-data-access';

// Famous people of a date from the API, the most popular first, a page at a time.
@Injectable({ providedIn: 'root' })
export class CelebritiesApiService extends ApiService {
  public getByDate(request: CelebritiesRequest): Observable<CelebritiesResponse> {
    return this.httpClient.get<CelebritiesResponse>(`${this.baseUrl}/celebrities`, { params: toCelebritiesQueryParams(request) });
  }
}
