import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, effect, inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, EMPTY, map, Observable, Subject, switchMap, tap, throwIfEmpty } from 'rxjs';
import { StateController } from '@birthday/web-shared-data-access';
import { NotificationsService, PlatformService } from '@birthday/web-shared-util';
import { APP_DEFAULT_LOCALE, APP_LOCALE_COOKIE, APP_LOCALE_COOKIE_MAX_AGE_SECONDS } from '../constants';
import { getCookieValue, getPreferredLocale, isAppLocale } from '../helpers';
import { AppLocale } from '../types';
import { LocaleState } from './locale.state';

@Injectable({ providedIn: 'root' })
export class LocaleController extends StateController {
  private readonly localeState: LocaleState = inject(LocaleState);
  private readonly transloco: TranslocoService = inject(TranslocoService);
  private readonly notifications: NotificationsService = inject(NotificationsService);
  private readonly platform: PlatformService = inject(PlatformService);
  private readonly document: Document = inject(DOCUMENT);
  private readonly request: Request | null = inject(REQUEST, { optional: true });
  private readonly platformId: object = inject(PLATFORM_ID);
  private readonly localeRequests: Subject<AppLocale> = new Subject<AppLocale>();

  constructor() {
    super();

    // `switchMap` drops a slower earlier choice, so the language the user picked last wins.
    this.localeRequests
      .pipe(
        switchMap((locale: AppLocale) =>
          this.load(locale).pipe(
            map(() => locale),
            catchError(() => {
              this.notifications.createErrorNotification(this.transloco.translate('i18n.loadError'));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((locale: AppLocale) => this.localeState.locale.set(locale));

    effect(() => {
      const locale: AppLocale = this.localeState.locale();

      this.transloco.setActiveLang(locale);
      this.document.documentElement.lang = locale;
    });

    // The server reads the cookie to render the next pages in the same language.
    effect(() => {
      const locale: AppLocale = this.localeState.locale();

      if (this.platform.isRendered()) {
        this.document.cookie = `${APP_LOCALE_COOKIE}=${locale}; path=/; max-age=${APP_LOCALE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
      }
    });
  }

  // Runs before the first render, so the server renders the page in the visitor's language and hydration sees the same texts.
  public init(): Observable<void> {
    const locale: AppLocale = this.detectLocale();

    return this.load(locale).pipe(
      map(() => locale),
      // A language that fails to load, for example an outdated chunk after a deploy, falls back to English instead of breaking the app.
      catchError(() => this.load(APP_DEFAULT_LOCALE).pipe(map((): AppLocale => APP_DEFAULT_LOCALE))),
      tap((loadedLocale: AppLocale) => this.localeState.locale.set(loadedLocale)),
      map(() => undefined),
    );
  }

  public changeLocale(locale: AppLocale): void {
    this.localeRequests.next(locale);
  }

  // With a fallback language Transloco never reports a failed load as an error: it emits the English texts when English is not
  // loaded yet, and completes without a value when it is. Both cases fail here, so `LocaleState` only gets a language that loaded.
  private load(locale: AppLocale): Observable<void> {
    return this.transloco.load(locale).pipe(
      throwIfEmpty(),
      map(() => {
        if (!Object.keys(this.transloco.getTranslation(locale)).length) {
          throw new Error(`The "${locale}" translations did not load.`);
        }
      }),
    );
  }

  private detectLocale(): AppLocale {
    return isPlatformBrowser(this.platformId) ? this.detectBrowserLocale() : this.detectRequestLocale();
  }

  // The cookie wins and a first visit gets the browser language. Route extraction at build time has no request and gets English.
  private detectRequestLocale(): AppLocale {
    const cookieLocale: string | null = getCookieValue(this.request?.headers.get('cookie'), APP_LOCALE_COOKIE);

    if (isAppLocale(cookieLocale)) {
      return cookieLocale;
    }

    return getPreferredLocale(this.request?.headers.get('accept-language')) ?? APP_DEFAULT_LOCALE;
  }

  // Repeats the server's choice from `<html lang>`, so hydration sees the same texts even when the page came from a cache.
  // The cookie matters only for a page the server did not render, such as the client-side fallback.
  private detectBrowserLocale(): AppLocale {
    const documentLocale: string = this.document.documentElement.lang;
    const cookieLocale: string | null = getCookieValue(this.document.cookie, APP_LOCALE_COOKIE);

    if (isAppLocale(documentLocale)) {
      return documentLocale;
    }

    return isAppLocale(cookieLocale) ? cookieLocale : APP_DEFAULT_LOCALE;
  }
}
