import { computed, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { eachMonthOfInterval, endOfYear, isSameDay, isSameMonth, startOfMonth, startOfYear } from 'date-fns';
import { AuthState } from '@birthday/web-auth-data-access';
import { GoogleCalendarState, GoogleCalendarStatus } from '@birthday/web-google-calendar-data-access';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { APP_LOCALE_FIRST_DAY_OF_WEEK, LocaleState } from '@birthday/web-shared-i18n';
import { PlatformService } from '@birthday/web-shared-util';
import { BirthdaysState } from '@birthday/web-birthdays-data-access';
import { Birthday, getAgeOnDate, getMonthGridDays, isBirthdayOn, UpcomingBirthday } from '@birthday/web-birthdays-util';
import { NEXT_BIRTHDAYS_LIMIT } from '../constants';
import { BirthdayDialogData, CalendarDay, CalendarMonth, CalendarView, GoogleCalendarPrompt, UpcomingCelebration } from '../types';

@Injectable()
export class CalendarState extends State {
  private readonly birthdaysState: ReadonlyState<BirthdaysState> = injectState(BirthdaysState);
  private readonly authState: ReadonlyState<AuthState> = injectState(AuthState);
  private readonly platform: PlatformService = inject(PlatformService);
  private readonly localeState: ReadonlyState<LocaleState> = injectState(LocaleState);
  private readonly googleCalendarState: ReadonlyState<GoogleCalendarState> = injectState(GoogleCalendarState);

  public readonly today: Date = this.birthdaysState.today;
  public readonly isLoading: Signal<boolean> = this.birthdaysState.isLoading;
  public readonly view: WritableSignal<CalendarView> = signal('month');
  public readonly viewMonth: WritableSignal<Date> = signal(startOfMonth(this.today));
  public readonly birthdayDialog: WritableSignal<BirthdayDialogData | null> = signal(null);
  public readonly isSigningIn: WritableSignal<boolean> = signal(false);
  // The session is known only in the browser, so the server and the first client render leave the prompt out.
  public readonly isSignInPromptVisible: Signal<boolean> = computed(() => this.platform.isRendered() && this.authState.status() === 'signedOut');
  public readonly isConnectingGoogleCalendar: WritableSignal<boolean> = signal(false);
  // `null` hides the prompt, also while the connection loads or failed to load.
  public readonly googleCalendarPrompt: Signal<GoogleCalendarPrompt | null> = computed(() => this.getGoogleCalendarPrompt());

  public readonly days: Signal<CalendarDay[]> = computed(() => this.getMonthDays(this.viewMonth(), this.birthdaysState.birthdays()));
  public readonly yearMonths: Signal<CalendarMonth[]> = computed(() => {
    const month: Date = this.viewMonth();
    const birthdays: Birthday[] = this.birthdaysState.birthdays();

    return eachMonthOfInterval({
      start: startOfYear(month),
      end: endOfYear(month),
    }).map(
      (date: Date): CalendarMonth => ({
        date,
        days: this.getMonthDays(date, birthdays),
      }),
    );
  });
  public readonly nextBirthdays: Signal<UpcomingCelebration[]> = computed(() => {
    return this.birthdaysState
      .upcomingBirthdays()
      .slice(0, NEXT_BIRTHDAYS_LIMIT)
      .map(
        (upcoming: UpcomingBirthday): UpcomingCelebration => ({
          ...upcoming,
          age: getAgeOnDate(upcoming.birthday.birthDate, upcoming.date),
        }),
      );
  });
  public readonly nextCelebration: Signal<UpcomingCelebration | null> = computed(() => this.nextBirthdays()[0] ?? null);

  public override resetState(): void {
    this.view.set('month');
    this.viewMonth.set(startOfMonth(this.today));
    this.birthdayDialog.set(null);
    this.isSigningIn.set(false);
    this.isConnectingGoogleCalendar.set(false);
  }

  private getGoogleCalendarPrompt(): GoogleCalendarPrompt | null {
    // No value while the connection loads or after it failed to load. A loaded `null` means it was never connected.
    if (!this.platform.isRendered() || !this.authState.isAuthenticated() || !this.googleCalendarState.connectionResource.hasValue()) {
      return null;
    }

    const status: GoogleCalendarStatus = this.googleCalendarState.connection()?.status ?? 'disconnected';

    return status === 'connected' ? null : status;
  }

  // Reads the language, so the grid starts the week on the language's first day and redraws after a switch.
  private getMonthDays(month: Date, birthdays: Birthday[]): CalendarDay[] {
    return getMonthGridDays(month, APP_LOCALE_FIRST_DAY_OF_WEEK[this.localeState.locale()]).map(
      (date: Date): CalendarDay => ({
        date,
        isCurrentMonth: isSameMonth(date, month),
        isToday: isSameDay(date, this.today),
        birthdays: birthdays.filter((birthday: Birthday) => isBirthdayOn(birthday.birthDate, date)),
      }),
    );
  }
}
