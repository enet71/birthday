import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { LocaleState } from '../state';
import { AppTranslateService } from './app-translate.service';

const EN = {
  greeting: 'Hello, {{ name }}',
  onlyEnglish: 'English only',
  days: { one: '{{ count }} day', other: '{{ count }} days' },
  people: { one: '{{ count }} person', other: '{{ count }} people' },
  daysUntil: { one: '{{ count }} day until {{ name }}', other: '{{ count }} days until {{ name }}' },
  formats: { short: 'MMM d' },
};

const RU = {
  greeting: 'Привет, {{ name }}',
  days: { one: '{{ count }} день', few: '{{ count }} дня', many: '{{ count }} дней', other: '{{ count }} дня' },
  // Lacks the `few` and `many` forms.
  people: { one: '{{ count }} человек', other: '{{ count }} человека' },
};

const DE = {
  formats: { short: 'd. MMM' },
};

describe('AppTranslateService', () => {
  let service: AppTranslateService;
  let state: LocaleState;

  beforeAll(() => registerLocaleData(localeDe));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: EN, ru: RU, de: DE },
          preloadLangs: true,
          translocoConfig: {
            availableLangs: ['en', 'ru', 'de'],
            defaultLang: 'en',
            fallbackLang: 'en',
            missingHandler: { useFallbackTranslation: true, logMissingKey: false },
          },
        }),
      ],
    });

    service = TestBed.inject(AppTranslateService);
    state = TestBed.inject(LocaleState);
  });

  describe('translate', () => {
    it('translates into the current locale with params', () => {
      state.locale.set('ru');

      expect(service.translate('greeting', { name: 'Аня' })).toBe('Привет, Аня');
    });

    it('shows the English text for a key missing in the current locale', () => {
      state.locale.set('ru');

      expect(service.translate('onlyEnglish')).toBe('English only');
    });
  });

  describe('translatePlural', () => {
    it.each([
      [1, '1 день'],
      [2, '2 дня'],
      [5, '5 дней'],
      [21, '21 день'],
    ])('picks the Russian plural category for %i', (count: number, expected: string) => {
      state.locale.set('ru');

      expect(service.translatePlural('days', count)).toBe(expected);
    });

    it.each([
      [1, '1 day'],
      [5, '5 days'],
    ])('picks the English plural category for %i', (count: number, expected: string) => {
      expect(service.translatePlural('days', count)).toBe(expected);
    });

    it('uses the English category in the current language when the language lacks that form', () => {
      state.locale.set('ru');

      // Russian 5 is `many`, which is missing; English 5 is `other`, which Russian has.
      expect(service.translatePlural('people', 5)).toBe('5 человека');
    });

    it('passes extra params next to the count', () => {
      expect(service.translatePlural('daysUntil', 3, { name: 'Ann' })).toBe('3 days until Ann');
    });
  });

  describe('formatDate', () => {
    const date = new Date(2026, 9, 25);

    it('formats with the format from the translation of the current locale', () => {
      expect(service.formatDate(date, 'formats.short')).toBe('Oct 25');
    });

    it('formats with the German format and month names', () => {
      state.locale.set('de');

      expect(service.formatDate(date, 'formats.short')).toBe('25. Okt.');
    });
  });
});
