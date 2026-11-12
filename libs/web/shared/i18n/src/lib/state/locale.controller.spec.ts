import type { Mock } from 'vitest';
import { DOCUMENT, PLATFORM_ID, REQUEST, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Translation, TranslocoService } from '@jsverse/transloco';
import { EMPTY, Observable, of, Subject, tap, throwError } from 'rxjs';
import { NotificationsService, PlatformService } from '@birthday/web-shared-util';
import { LocaleController } from './locale.controller';
import { LocaleState } from './locale.state';

interface FakeDocument {
  documentElement: { lang: string };
  cookie: string;
}

interface SetupOptions {
  platform: 'browser' | 'server';
  request?: Request | null;
  documentLang?: string;
  documentCookie?: string;
}

describe('LocaleController', () => {
  let controller: LocaleController;
  let state: LocaleState;
  let fakeDocument: FakeDocument;
  let isRendered: WritableSignal<boolean>;
  // Translations that finished loading, as `TranslocoService.getTranslation(lang)` reports them.
  let loaded: Record<string, Translation>;
  const transloco: {
    load: Mock<(lang: string) => Observable<Translation>>;
    getTranslation: Mock<(lang: string) => Translation>;
    setActiveLang: Mock<(lang: string) => void>;
    translate: Mock<(key: string) => string>;
  } = {
    load: vi.fn(),
    getTranslation: vi.fn(),
    setActiveLang: vi.fn(),
    translate: vi.fn(),
  };
  const notifications: { createErrorNotification: Mock<NotificationsService['createErrorNotification']> } = {
    createErrorNotification: vi.fn(),
  };

  // Loads the language like Transloco does: emits its texts and stores them.
  function loadsSuccessfully(lang: string): Observable<Translation> {
    const translation: Translation = { greeting: `hello-${lang}` };

    return of(translation).pipe(tap(() => (loaded[lang] = translation)));
  }

  function setup(options: SetupOptions): void {
    fakeDocument = { documentElement: { lang: options.documentLang ?? '' }, cookie: options.documentCookie ?? '' };
    isRendered = signal(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: options.platform },
        { provide: REQUEST, useValue: options.request ?? null },
        { provide: DOCUMENT, useValue: fakeDocument },
        { provide: TranslocoService, useValue: transloco },
        { provide: NotificationsService, useValue: notifications },
        { provide: PlatformService, useValue: { isRendered } },
      ],
    });

    controller = TestBed.inject(LocaleController);
    state = TestBed.inject(LocaleState);
  }

  function createRequest(headers: Record<string, string>): Request {
    return new Request('https://birthdly.test/', { headers });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    loaded = {};
    transloco.load.mockImplementation(loadsSuccessfully);
    transloco.getTranslation.mockImplementation((lang: string) => loaded[lang] ?? {});
    transloco.translate.mockImplementation((key: string) => key);
  });

  describe('init on the server', () => {
    it('uses the locale cookie over Accept-Language', () => {
      setup({ platform: 'server', request: createRequest({ cookie: 'theme=dark; locale=ru', 'accept-language': 'de' }) });

      controller.init().subscribe();

      expect(transloco.load).toHaveBeenCalledWith('ru');
      expect(state.locale()).toBe('ru');
    });

    it('uses Accept-Language when the cookie holds an unsupported value', () => {
      setup({ platform: 'server', request: createRequest({ cookie: 'locale=xx', 'accept-language': 'ja,de-CH;q=0.8,fr;q=0.5' }) });

      controller.init().subscribe();

      expect(state.locale()).toBe('de');
    });

    it('uses English when neither the cookie nor Accept-Language has a supported language', () => {
      setup({ platform: 'server', request: createRequest({ 'accept-language': 'ja' }) });

      controller.init().subscribe();

      expect(transloco.load).toHaveBeenCalledWith('en');
      expect(state.locale()).toBe('en');
    });

    it('uses English without a request', () => {
      setup({ platform: 'server', request: null });

      controller.init().subscribe();

      expect(state.locale()).toBe('en');
    });
  });

  describe('init in the browser', () => {
    it('repeats the server choice from <html lang> over the cookie', () => {
      setup({ platform: 'browser', documentLang: 'fr', documentCookie: 'locale=de' });

      controller.init().subscribe();

      expect(state.locale()).toBe('fr');
    });

    it('uses the cookie when <html lang> is not a supported locale', () => {
      setup({ platform: 'browser', documentLang: '', documentCookie: 'locale=de' });

      controller.init().subscribe();

      expect(state.locale()).toBe('de');
    });

    it('uses English without <html lang> and cookie', () => {
      setup({ platform: 'browser' });

      controller.init().subscribe();

      expect(state.locale()).toBe('en');
    });
  });

  describe('init fallback', () => {
    beforeEach(() => setup({ platform: 'browser', documentLang: 'ru' }));

    it('falls back to English when the load completes without a value', () => {
      transloco.load.mockImplementation((lang: string) => (lang === 'ru' ? EMPTY : loadsSuccessfully(lang)));

      controller.init().subscribe();

      expect(transloco.load).toHaveBeenLastCalledWith('en');
      expect(state.locale()).toBe('en');
    });

    it('falls back to English when only the fallback texts load', () => {
      transloco.load.mockImplementation((lang: string) => (lang === 'ru' ? loadsSuccessfully('en') : loadsSuccessfully(lang)));

      controller.init().subscribe();

      expect(state.locale()).toBe('en');
    });

    it('falls back to English when the load fails', () => {
      transloco.load.mockImplementation((lang: string) => (lang === 'ru' ? throwError(() => new Error('chunk')) : loadsSuccessfully(lang)));

      controller.init().subscribe();

      expect(state.locale()).toBe('en');
    });

    it('emits once the locale is set', () => {
      const emitted: Mock<() => void> = vi.fn();

      controller.init().subscribe(emitted);

      expect(emitted).toHaveBeenCalledTimes(1);
      expect(state.locale()).toBe('ru');
    });
  });

  describe('changeLocale', () => {
    beforeEach(() => setup({ platform: 'browser' }));

    it('sets the locale once its texts loaded', () => {
      controller.changeLocale('de');

      expect(transloco.load).toHaveBeenCalledWith('de');
      expect(state.locale()).toBe('de');
      expect(notifications.createErrorNotification).not.toHaveBeenCalled();
    });

    it('keeps the previous locale and notifies when the load completes empty', () => {
      transloco.load.mockReturnValue(EMPTY);

      controller.changeLocale('de');

      expect(state.locale()).toBe('en');
      expect(transloco.translate).toHaveBeenCalledWith('i18n.loadError');
      expect(notifications.createErrorNotification).toHaveBeenCalledWith('i18n.loadError');
    });

    it('keeps the previous locale and notifies when only the fallback texts load', () => {
      transloco.load.mockImplementation(() => loadsSuccessfully('en'));

      controller.changeLocale('de');

      expect(state.locale()).toBe('en');
      expect(notifications.createErrorNotification).toHaveBeenCalledWith('i18n.loadError');
    });

    it('still switches after a failed switch', () => {
      transloco.load.mockReturnValueOnce(EMPTY);

      controller.changeLocale('de');
      controller.changeLocale('fr');

      expect(state.locale()).toBe('fr');
    });

    it('applies the last chosen locale when switches overlap', () => {
      const loads: Record<string, Subject<Translation>> = { de: new Subject<Translation>(), fr: new Subject<Translation>() };
      transloco.load.mockImplementation((lang: string) => loads[lang].pipe(tap((translation: Translation) => (loaded[lang] = translation))));

      controller.changeLocale('de');
      controller.changeLocale('fr');
      loads['fr'].next({ greeting: 'bonjour' });
      loads['de'].next({ greeting: 'hallo' });

      expect(state.locale()).toBe('fr');
    });

    it('ignores an earlier slower switch that finishes after the later one was chosen', () => {
      const loads: Record<string, Subject<Translation>> = { de: new Subject<Translation>(), fr: new Subject<Translation>() };
      transloco.load.mockImplementation((lang: string) => loads[lang].pipe(tap((translation: Translation) => (loaded[lang] = translation))));

      controller.changeLocale('de');
      controller.changeLocale('fr');
      loads['de'].next({ greeting: 'hallo' });

      expect(state.locale()).toBe('en');
    });
  });

  describe('effects', () => {
    beforeEach(() => setup({ platform: 'browser' }));

    it('activates the locale in Transloco and writes <html lang>', () => {
      state.locale.set('uk');
      TestBed.tick();

      expect(transloco.setActiveLang).toHaveBeenLastCalledWith('uk');
      expect(fakeDocument.documentElement.lang).toBe('uk');
    });

    it('does not write the cookie before the first render', () => {
      state.locale.set('de');
      TestBed.tick();

      expect(fakeDocument.cookie).toBe('');
    });

    it('writes the cookie after the first render', () => {
      state.locale.set('de');
      isRendered.set(true);
      TestBed.tick();

      expect(fakeDocument.cookie).toBe('locale=de; path=/; max-age=31536000; samesite=lax');
    });

    it('rewrites the cookie after a switch', () => {
      isRendered.set(true);
      TestBed.tick();

      controller.changeLocale('es');
      TestBed.tick();

      expect(fakeDocument.cookie).toBe('locale=es; path=/; max-age=31536000; samesite=lax');
    });
  });
});
