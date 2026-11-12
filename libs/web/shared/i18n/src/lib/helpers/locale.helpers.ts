import { APP_LOCALES } from '../constants';
import { AppLocale } from '../types';

interface LanguagePreference {
  language: string;
  quality: number;
}

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return APP_LOCALES.includes(value as AppLocale);
}

// Picks the best supported language from an `Accept-Language` header, or `null` when none matches.
export function getPreferredLocale(acceptLanguage: string | null | undefined): AppLocale | null {
  return (
    (acceptLanguage ?? '')
      .split(',')
      .map(parseLanguagePreference)
      .filter((preference: LanguagePreference) => preference.quality > 0)
      .sort((a: LanguagePreference, b: LanguagePreference) => b.quality - a.quality)
      .map((preference: LanguagePreference) => preference.language)
      .find(isAppLocale) ?? null
  );
}

// Returns the raw value; app cookies hold plain ASCII, and decoding would throw on a malformed foreign value.
export function getCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  const cookie: string | undefined = cookieHeader
    ?.split(';')
    .map((item: string) => item.trim())
    .find((item: string) => item.startsWith(`${name}=`));

  return cookie ? cookie.slice(name.length + 1) : null;
}

// `de-CH;q=0.8` → `{ language: 'de', quality: 0.8 }`; a missing or invalid quality counts as 1.
function parseLanguagePreference(item: string): LanguagePreference {
  const [tag, ...params] = item.split(';').map((part: string) => part.trim());
  const qualityParam: string | undefined = params.find((param: string) => param.startsWith('q='));
  const quality: number = qualityParam ? Number(qualityParam.slice(2)) : 1;

  return { language: tag.split('-')[0].toLowerCase(), quality: Number.isNaN(quality) ? 1 : quality };
}
