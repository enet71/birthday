import { effect, inject, Injectable, PLATFORM_ID, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Event as RouterEvent, NavigationEnd, Router, UrlTree } from '@angular/router';
import { filter, finalize, Observable } from 'rxjs';
import { addMonths, addYears, parseISO, startOfMonth } from 'date-fns';
import { AuthController } from '@birthday/web-auth-data-access';
import { GoogleCalendarController, GoogleCalendarState } from '@birthday/web-google-calendar-data-access';
import { injectState, ReadonlyState, StateController } from '@birthday/web-shared-data-access';
import { BirthdayInput, BirthdaysController } from '@birthday/web-birthdays-data-access';
import { Birthday, CALENDAR_ADD_BIRTHDAY_QUERY_PARAM } from '@birthday/web-birthdays-util';
import { BirthdayDialogData, BirthdayFormModel, CalendarView } from '../types';
import { CalendarState } from './calendar.state';

@Injectable()
export class CalendarController extends StateController {
  private readonly calendarState: CalendarState = inject(CalendarState);
  private readonly birthdaysController: BirthdaysController = inject(BirthdaysController);
  private readonly googleCalendarState: ReadonlyState<GoogleCalendarState> = injectState(GoogleCalendarState);
  private readonly googleCalendarController: GoogleCalendarController = inject(GoogleCalendarController);
  private readonly authController: AuthController = inject(AuthController);
  private readonly router: Router = inject(Router);

  constructor() {
    super();
    this.birthdaysController.reloadBirthdays();
    // Dialogs open only in the browser, so the server render of a link to the dialog shows the plain calendar.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.openAddBirthdayDialogFromLinks();
    }
    // Brings changes from Google once the connection is known; the server limits it to once an hour.
    effect(() => {
      if (this.googleCalendarState.isConnected()) {
        untracked(() => this.importFromGoogle());
      }
    });
  }

  public setView(view: CalendarView): void {
    this.calendarState.view.set(view);
  }

  public showPrevious(): void {
    this.shiftViewMonth(-1);
  }

  public showNext(): void {
    this.shiftViewMonth(1);
  }

  public showToday(): void {
    this.calendarState.viewMonth.set(startOfMonth(this.calendarState.today));
  }

  public openAddBirthdayDialog(date: Date = this.calendarState.today): void {
    this.calendarState.birthdayDialog.set({ date });
  }

  public openEditBirthdayDialog(birthday: Birthday): void {
    this.calendarState.birthdayDialog.set({ date: parseISO(birthday.birthDate), birthday });
  }

  public closeBirthdayDialog(): void {
    this.calendarState.birthdayDialog.set(null);
  }

  public saveBirthday({ name, month, day, year, relationship, notes }: BirthdayFormModel): void {
    const dialog: BirthdayDialogData | null = this.calendarState.birthdayDialog();
    const isYearKnown: boolean = year !== '';
    // Without a year, a leap year keeps Feb 29; the year is then replaced by the unknown-year marker.
    const date: Date = new Date(isYearKnown ? Number(year) : 2000, month - 1, day);
    const input: BirthdayInput = { name, date, isYearKnown, relationship, notes };
    const save$: Observable<Birthday> = dialog?.birthday
      ? this.birthdaysController.updateBirthday(dialog.birthday.id, input)
      : this.birthdaysController.addBirthday(input);

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.closeBirthdayDialogIfCurrent(dialog));
  }

  public deleteBirthday(): void {
    const dialog: BirthdayDialogData | null = this.calendarState.birthdayDialog();

    if (!dialog?.birthday) {
      return;
    }

    // Both storages emit once on success; a failed delete completes without emitting and keeps the dialog open.
    this.birthdaysController
      .deleteBirthday(dialog.birthday.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.closeBirthdayDialogIfCurrent(dialog));
  }

  public signInWithGoogle(): void {
    this.calendarState.isSigningIn.set(true);
    this.authController
      .signInWithGoogle()
      .pipe(
        finalize(() => this.calendarState.isSigningIn.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  // A slow request must not close a dialog the user opened after closing the one it started from.
  private closeBirthdayDialogIfCurrent(dialog: BirthdayDialogData | null): void {
    if (this.calendarState.birthdayDialog() === dialog) {
      this.closeBirthdayDialog();
    }
  }

  // Pages outside the calendar link here with a query parameter to open the Add birthday dialog.
  private openAddBirthdayDialogFromLinks(): void {
    this.router.events
      .pipe(
        filter((event: RouterEvent): event is NavigationEnd => event instanceof NavigationEnd),
        filter(({ urlAfterRedirects }: NavigationEnd) => this.isAddBirthdayLink(urlAfterRedirects)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.openAddBirthdayDialog();
        this.router.navigate([], {
          queryParams: { [CALENDAR_ADD_BIRTHDAY_QUERY_PARAM]: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
  }

  // Route providers outlive the page, so links elsewhere must not open the calendar dialog.
  private isAddBirthdayLink(url: string): boolean {
    const tree: UrlTree = this.router.parseUrl(url);

    return !tree.root.hasChildren() && tree.queryParamMap.has(CALENDAR_ADD_BIRTHDAY_QUERY_PARAM);
  }

  private importFromGoogle(): void {
    this.googleCalendarController
      .syncAutomatically()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.birthdaysController.reloadBirthdaysWhenIdle());
  }

  private shiftViewMonth(step: number): void {
    const shift: (date: Date, amount: number) => Date = this.calendarState.view() === 'year' ? addYears : addMonths;

    this.calendarState.viewMonth.update((month: Date) => shift(month, step));
  }
}
