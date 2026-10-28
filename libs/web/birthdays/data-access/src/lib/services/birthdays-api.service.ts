import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BirthdayDto, CreateBirthdayRequest, UpdateBirthdayRequest } from '@birthday/shared-models';
import { ApiService } from '@birthday/web-shared-data-access';
import { BirthdaysRemoteStorage } from './birthdays-remote.storage';

@Injectable({ providedIn: 'root' })
export class BirthdaysApiService extends ApiService implements BirthdaysRemoteStorage {
  private readonly birthdaysUrl = `${this.baseUrl}/birthdays`;

  public getAll(): Observable<BirthdayDto[]> {
    return this.httpClient.get<BirthdayDto[]>(this.birthdaysUrl);
  }

  public create(request: CreateBirthdayRequest): Observable<BirthdayDto> {
    return this.httpClient.post<BirthdayDto>(this.birthdaysUrl, request);
  }

  public update(id: string, request: UpdateBirthdayRequest): Observable<BirthdayDto> {
    return this.httpClient.patch<BirthdayDto>(`${this.birthdaysUrl}/${id}`, request);
  }

  public delete(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.birthdaysUrl}/${id}`);
  }
}
