import { getCookieValue, getPreferredLocale, isAppLocale } from './locale.helpers';

describe('isAppLocale', () => {
  it.each(['en', 'es', 'de', 'fr', 'ru', 'uk'])('accepts the supported locale %s', (value: string) => {
    expect(isAppLocale(value)).toBe(true);
  });

  it.each(['', 'EN', 'de-CH', 'ja', null, undefined])('rejects %s', (value: string | null | undefined) => {
    expect(isAppLocale(value)).toBe(false);
  });
});

describe('getPreferredLocale', () => {
  it('picks the supported language with the highest quality', () => {
    expect(getPreferredLocale('en;q=0.5,fr;q=0.9,ru;q=0.7')).toBe('fr');
  });

  it('maps a region tag to its language', () => {
    expect(getPreferredLocale('de-CH,en;q=0.8')).toBe('de');
  });

  it('ignores the case of the tag', () => {
    expect(getPreferredLocale('UK-ua')).toBe('uk');
  });

  it('skips unsupported languages', () => {
    expect(getPreferredLocale('ja,zh-CN;q=0.9,es;q=0.5')).toBe('es');
  });

  it('excludes languages with q=0', () => {
    expect(getPreferredLocale('ru;q=0,fr;q=0.1')).toBe('fr');
  });

  it('keeps the header order for equal qualities', () => {
    expect(getPreferredLocale('fr, de')).toBe('fr');
  });

  it('counts a missing or invalid quality as 1', () => {
    expect(getPreferredLocale('en;q=0.9,de;q=abc')).toBe('de');
  });

  it('returns null when no language is supported', () => {
    expect(getPreferredLocale('ja,*;q=0.5')).toBeNull();
  });

  it('returns null when every supported language has q=0', () => {
    expect(getPreferredLocale('en;q=0,de;q=0')).toBeNull();
  });

  it.each(['', null, undefined])('returns null for the empty header %s', (header: string | null | undefined) => {
    expect(getPreferredLocale(header)).toBeNull();
  });
});

describe('getCookieValue', () => {
  it('returns the value of the named cookie', () => {
    expect(getCookieValue('theme=dark; locale=ru; session=abc', 'locale')).toBe('ru');
  });

  it('does not match a cookie whose name only ends with the name', () => {
    expect(getCookieValue('applocale=de; locale=fr', 'locale')).toBe('fr');
  });

  it('returns null when the cookie is missing', () => {
    expect(getCookieValue('theme=dark', 'locale')).toBeNull();
  });

  it.each([null, undefined, ''])('returns null for the empty header %s', (header: string | null | undefined) => {
    expect(getCookieValue(header, 'locale')).toBeNull();
  });

  it('returns a malformed encoded value as is instead of throwing', () => {
    expect(() => getCookieValue('locale=%E0%A4%A', 'locale')).not.toThrow();
    expect(getCookieValue('locale=%E0%A4%A', 'locale')).toBe('%E0%A4%A');
  });
});
