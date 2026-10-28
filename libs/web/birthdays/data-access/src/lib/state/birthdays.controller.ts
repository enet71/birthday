import { effect, inject, Injectable, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, concatMap, EMPTY, filter, from, map, Observable, of, switchMap, take, tap, toArray } from 'rxjs';
import { BirthdayDto } from '@birthday/shared-models';
import { AuthState } from '@birthday/web-auth-data-access';
import { injectState, ReadonlyState, StateController } from '@birthday/web-shared-data-access';
import { NotificationsService } from '@birthday/web-shared-util';
import { Birthday, toBirthDate } from '@birthday/web-birthdays-util';
import { BirthdaysDataService, BirthdaysLocalStorageService, BirthdaysRemoteStorage } from '../services';
import { BirthdaysState } from './birthdays.state';

@Injectable({ providedIn: 'root' })
export class BirthdaysController extends StateController {
  private readonly birthdaysState: BirthdaysState = inject(BirthdaysState);
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly birthdaysData: BirthdaysDataService = inject(BirthdaysDataService);
  private readonly localStorage: BirthdaysLocalStorageService = inject(BirthdaysLocalStorageService);
  private readonly remoteStorage: BirthdaysRemoteStorage = inject(BirthdaysRemoteStorage);
  private readonly notifications: NotificationsService = inject(NotificationsService);
  private readonly isListLoading$: Observable<boolean> = toObservable(this.birthdaysState.birthdaysResource.isLoading);

  constructor() {
    super();
    effect(() => {
      if (this.birthdaysState.birthdaysResource.error()) {
        this.notifications.createErrorNotification("Couldn't load birthdays");
      }
    });
    effect(() => {
      if (this.authState.isAuthenticated()) {
        untracked(() => this.importLocalBirthdays());
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

  // Moves the birthdays a user added while signed out into their account. Each one leaves local storage only after it
  // is saved, and a failed one does not stop the rest, so the failed ones stay local for the next sign-in.
  private importLocalBirthdays(): void {
    this.localStorage
      .getAll()
      .pipe(
        filter((birthdays: BirthdayDto[]) => birthdays.length > 0),
        switchMap((birthdays: BirthdayDto[]) =>
          from(birthdays).pipe(
            concatMap(({ id, name, birthDate }: BirthdayDto) =>
              this.remoteStorage.create({ name, birthDate }).pipe(
                concatMap(() => this.localStorage.delete(id)),
                map(() => true),
                catchError(() => of(false)),
              ),
            ),
            toArray(),
          ),
        ),
        tap((results: boolean[]) => {
          const failedCount: number = results.filter((isMoved: boolean) => !isMoved).length;

          if (failedCount > 0) {
            this.notifications.createErrorNotification(`Couldn't move ${failedCount} local birthday(s) to your account`);
          }
        }),
        // `reload()` is ignored while a load is in flight, so wait for the current load of the account list first.
        switchMap(() =>
          this.isListLoading$.pipe(
            filter((isLoading: boolean) => !isLoading),
            take(1),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.birthdaysState.birthdaysResource.reload());
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
