import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeRu from '@angular/common/locales/ru';
import { TestBed } from '@angular/core/testing';
import { LocaleState } from '../state';
import { LocaleDatePipe } from './locale-date.pipe';

describe('LocaleDatePipe', () => {
  const date = new Date(2026, 9, 25);
  let pipe: LocaleDatePipe;
  let state: LocaleState;

  beforeAll(() => {
    registerLocaleData(localeDe);
    registerLocaleData(localeRu);
  });

  beforeEach(() => {
    state = TestBed.inject(LocaleState);
    pipe = TestBed.runInInjectionContext(() => new LocaleDatePipe());
  });

  it('formats with the current locale', () => {
    state.locale.set('de');

    expect(pipe.transform(date, 'd MMMM y')).toBe('25 Oktober 2026');
  });

  it('formats the same date again after a language switch', () => {
    expect(pipe.transform(date, 'd MMMM y')).toBe('25 October 2026');

    state.locale.set('ru');

    expect(pipe.transform(date, 'd MMMM y')).toBe('25 октября 2026');
  });

  it('formats again when the format changes', () => {
    expect(pipe.transform(date, 'MMMM')).toBe('October');
    expect(pipe.transform(date, 'MMM d')).toBe('Oct 25');
  });

  it('accepts ISO strings', () => {
    expect(pipe.transform('2026-10-25', 'd MMM y')).toBe('25 Oct 2026');
  });

  it.each([null, undefined])('returns null for %s', (value: null | undefined) => {
    expect(pipe.transform(value, 'd MMMM y')).toBeNull();
  });
});
