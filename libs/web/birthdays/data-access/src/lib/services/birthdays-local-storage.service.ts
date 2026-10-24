import { inject, Injectable } from '@angular/core';
import { defer, Observable, of, throwError } from 'rxjs';
import {
  BirthdayDto,
  CreateBirthdayRequest,
  UpdateBirthdayRequest,
} from '@birthday/shared-models';
import {
  BrowserStorageService,
  LocalStorageKey,
} from '@birthday/web-shared-util';
import { BirthdaysStorage } from './birthdays.storage';

// Keeps the birthdays of a signed-out user in the browser.
@Injectable({ providedIn: 'root' })
export class BirthdaysLocalStorageService implements BirthdaysStorage {
  private readonly browserStorage: BrowserStorageService = inject(
    BrowserStorageService,
  );

  public getAll(): Observable<BirthdayDto[]> {
    return defer(() => of(this.read()));
  }

  public create(request: CreateBirthdayRequest): Observable<BirthdayDto> {
    return defer(() => {
      const birthday: BirthdayDto = { ...request, id: this.createId() };

      this.write([...this.read(), birthday]);
      return of(birthday);
    });
  }

  public update(
    id: string,
    request: UpdateBirthdayRequest,
  ): Observable<BirthdayDto> {
    return defer(() => {
      const birthdays: BirthdayDto[] = this.read();
      const current: BirthdayDto | undefined = birthdays.find(
        (birthday: BirthdayDto) => birthday.id === id,
      );

      if (!current) {
        return throwError(() => new Error(`Birthday ${id} not found`));
      }

      const updated: BirthdayDto = { ...current, ...request, id };

      this.write(
        birthdays.map((birthday: BirthdayDto) =>
          birthday.id === id ? updated : birthday,
        ),
      );
      return of(updated);
    });
  }

  public delete(id: string): Observable<void> {
    return defer(() => {
      this.write(
        this.read().filter((birthday: BirthdayDto) => birthday.id !== id),
      );
      return of(undefined);
    });
  }

  private read(): BirthdayDto[] {
    const value: string | null = this.browserStorage.getLocalItem(
      LocalStorageKey.BIRTHDAYS,
    );

    if (!value) {
      return [];
    }

    // Stored data can be edited by hand or left by an older version.
    try {
      const birthdays: unknown = JSON.parse(value);

      return Array.isArray(birthdays) ? birthdays.filter(this.isBirthday) : [];
    } catch {
      return [];
    }
  }

  private isBirthday(value: unknown): value is BirthdayDto {
    const birthday = value as Partial<BirthdayDto> | null;

    return (
      typeof birthday?.id === 'string' &&
      typeof birthday.name === 'string' &&
      typeof birthday.birthDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(birthday.birthDate)
    );
  }

  private write(birthdays: BirthdayDto[]): void {
    this.browserStorage.setLocalItem(
      LocalStorageKey.BIRTHDAYS,
      JSON.stringify(birthdays),
    );
  }

  private createId(): string {
    // `crypto.randomUUID` is unavailable outside secure contexts (e.g. a LAN IP over HTTP).
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
