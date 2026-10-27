import { effect, inject, Injectable } from '@angular/core';
import { catchError, EMPTY, Observable, tap } from 'rxjs';
import { StateController } from '@birthday/web-shared-data-access';
import { NotificationsService } from '@birthday/web-shared-util';
import { Birthday, toBirthDate } from '@birthday/web-birthdays-util';
import { BirthdaysDataService } from '../services';
import { BirthdaysState } from './birthdays.state';

@Injectable({ providedIn: 'root' })
export class BirthdaysController extends StateController {
  private readonly birthdaysState: BirthdaysState = inject(BirthdaysState);
  private readonly birthdaysData: BirthdaysDataService = inject(BirthdaysDataService);
  private readonly notifications: NotificationsService = inject(NotificationsService);

  constructor() {
    super();
    effect(() => {
      if (this.birthdaysState.birthdaysResource.error()) {
        this.notifications.createErrorNotification("Couldn't load birthdays");
      }
    });
  }

  // Reloads on every entry to the calendar, which also retries a failed load.
  public reloadBirthdays(): void {
    this.birthdaysState.birthdaysResource.reload();
  }

  // The methods below complete without emitting when the change could not be saved.
  public addBirthday(name: string, date: Date): Observable<Birthday> {
    return this.birthdaysData.create({ name: name.trim(), birthDate: toBirthDate(date) }).pipe(
      tap((birthday: Birthday) => this.updateBirthdays((birthdays: Birthday[]) => [...birthdays, birthday])),
      catchError(() => {
        this.notifications.createErrorNotification("Couldn't save the birthday");
        return EMPTY;
      }),
    );
  }

  public updateBirthday(id: string, name: string, date: Date): Observable<Birthday> {
    return this.birthdaysData.update(id, { name: name.trim(), birthDate: toBirthDate(date) }).pipe(
      tap((updated: Birthday) =>
        this.updateBirthdays((birthdays: Birthday[]) => birthdays.map((birthday: Birthday) => (birthday.id === id ? updated : birthday))),
      ),
      catchError(() => {
        this.notifications.createErrorNotification("Couldn't save the birthday");
        return EMPTY;
      }),
    );
  }

  public deleteBirthday(id: string): Observable<void> {
    // A `DELETE` response may complete without emitting a value.
    return this.birthdaysData.delete(id).pipe(
      tap({
        complete: () => this.updateBirthdays((birthdays: Birthday[]) => birthdays.filter((birthday: Birthday) => birthday.id !== id)),
      }),
      catchError(() => {
        this.notifications.createErrorNotification("Couldn't delete the birthday");
        return EMPTY;
      }),
    );
  }

  // Writes through `birthdays()` so a failed load is updated from an empty list.
  private updateBirthdays(updater: (birthdays: Birthday[]) => Birthday[]): void {
    const isLoading: boolean = this.birthdaysState.isLoading();

    this.birthdaysState.birthdaysResource.set(updater(this.birthdaysState.birthdays()));
    // `set()` aborts an in-flight load, so load the list again with the saved change.
    if (isLoading) {
      this.birthdaysState.birthdaysResource.reload();
    }
  }
}
