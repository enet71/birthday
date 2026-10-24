import { inject, Injectable } from '@angular/core';
import { catchError, EMPTY, map, Observable, of, tap } from 'rxjs';
import { StateController } from '@birthday/web-shared-data-access';
import { NotificationsService } from '@birthday/web-shared-util';
import { Birthday, toBirthDate } from '@birthday/web-birthdays-util';
import { BirthdaysDataService } from '../services';
import { BirthdaysState } from './birthdays.state';

@Injectable({ providedIn: 'root' })
export class BirthdaysController extends StateController {
  private readonly birthdaysState: BirthdaysState = inject(BirthdaysState);
  private readonly birthdaysData: BirthdaysDataService =
    inject(BirthdaysDataService);
  private readonly notifications: NotificationsService =
    inject(NotificationsService);

  public loadBirthdays(): Observable<void> {
    return this.birthdaysData.getAll().pipe(
      tap((birthdays: Birthday[]) =>
        this.birthdaysState.birthdays.set(birthdays),
      ),
      map(() => undefined),
      catchError(() => {
        this.notifications.createErrorNotification("Couldn't load birthdays");
        return of(undefined);
      }),
    );
  }

  // The methods below complete without emitting when the change could not be saved.
  public addBirthday(name: string, date: Date): Observable<Birthday> {
    return this.birthdaysData
      .create({ name: name.trim(), birthDate: toBirthDate(date) })
      .pipe(
        tap((birthday: Birthday) =>
          this.birthdaysState.birthdays.update((birthdays: Birthday[]) => [
            ...birthdays,
            birthday,
          ]),
        ),
        catchError(() => {
          this.notifications.createErrorNotification(
            "Couldn't save the birthday",
          );
          return EMPTY;
        }),
      );
  }

  public updateBirthday(
    id: string,
    name: string,
    date: Date,
  ): Observable<Birthday> {
    return this.birthdaysData
      .update(id, { name: name.trim(), birthDate: toBirthDate(date) })
      .pipe(
        tap((updated: Birthday) =>
          this.birthdaysState.birthdays.update((birthdays: Birthday[]) =>
            birthdays.map((birthday: Birthday) =>
              birthday.id === id ? updated : birthday,
            ),
          ),
        ),
        catchError(() => {
          this.notifications.createErrorNotification(
            "Couldn't save the birthday",
          );
          return EMPTY;
        }),
      );
  }

  public deleteBirthday(id: string): Observable<void> {
    // A `DELETE` response may complete without emitting a value.
    return this.birthdaysData.delete(id).pipe(
      tap({
        complete: () =>
          this.birthdaysState.birthdays.update((birthdays: Birthday[]) =>
            birthdays.filter((birthday: Birthday) => birthday.id !== id),
          ),
      }),
      catchError(() => {
        this.notifications.createErrorNotification(
          "Couldn't delete the birthday",
        );
        return EMPTY;
      }),
    );
  }
}
