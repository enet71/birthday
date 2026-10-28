import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BirthdayDto, CreateBirthdayRequest, UpdateBirthdayRequest } from '@birthday/shared-models';
import { AuthState } from '@birthday/web-auth-data-access';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { BirthdaysLocalStorageService } from './birthdays-local-storage.service';
import { BirthdaysRemoteStorage } from './birthdays-remote.storage';
import { BirthdaysStorage } from './birthdays.storage';

// Sends each call to the account storage for a signed-in user and to local storage otherwise.
@Injectable({ providedIn: 'root' })
export class BirthdaysDataService implements BirthdaysStorage {
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly remoteStorage: BirthdaysRemoteStorage = inject(BirthdaysRemoteStorage);
  private readonly localStorage: BirthdaysLocalStorageService = inject(BirthdaysLocalStorageService);

  private get storage(): BirthdaysStorage {
    return this.authState.isAuthenticated() ? this.remoteStorage : this.localStorage;
  }

  public getAll(): Observable<BirthdayDto[]> {
    return this.storage.getAll();
  }

  public create(request: CreateBirthdayRequest): Observable<BirthdayDto> {
    return this.storage.create(request);
  }

  public update(id: string, request: UpdateBirthdayRequest): Observable<BirthdayDto> {
    return this.storage.update(id, request);
  }

  public delete(id: string): Observable<void> {
    return this.storage.delete(id);
  }
}
