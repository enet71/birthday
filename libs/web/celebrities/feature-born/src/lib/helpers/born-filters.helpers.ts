import { Params, ParamMap } from '@angular/router';
import {
  AppLocale,
  CELEBRITY_COUNTRIES,
  CELEBRITY_DECADES,
  CELEBRITY_OCCUPATIONS,
  CELEBRITY_SORTS,
  CELEBRITY_STATUSES,
  CelebritiesRequest,
} from '@birthday/shared-models';
import {
  BORN_COUNTRY_QUERY_PARAM,
  BORN_DECADE_QUERY_PARAM,
  BORN_OCCUPATION_QUERY_PARAM,
  BORN_SORT_QUERY_PARAM,
  BORN_STATUS_QUERY_PARAM,
} from '../constants';
import { BornDate, BornFilters } from '../types';

export const BORN_DEFAULT_FILTERS: BornFilters = { countries: [], occupations: [], decades: [], status: 'all', sort: 'popularity' };

// Unknown values are dropped; the lists keep the order of the options, so equal filters give equal URLs.
export function readBornFilters(query: ParamMap): BornFilters {
  const status: string | null = query.get(BORN_STATUS_QUERY_PARAM);
  const sort: string | null = query.get(BORN_SORT_QUERY_PARAM);

  return {
    countries: readList(query.get(BORN_COUNTRY_QUERY_PARAM)?.toUpperCase(), CELEBRITY_COUNTRIES),
    occupations: readList(query.get(BORN_OCCUPATION_QUERY_PARAM), CELEBRITY_OCCUPATIONS),
    decades: readList(query.get(BORN_DECADE_QUERY_PARAM), CELEBRITY_DECADES),
    status: CELEBRITY_STATUSES.find((value: string) => value === status) ?? BORN_DEFAULT_FILTERS.status,
    sort: CELEBRITY_SORTS.find((value: string) => value === sort) ?? BORN_DEFAULT_FILTERS.sort,
  };
}

// Default values become `null`, so a merging navigation removes them from the URL.
export function toBornFilterQueryParams(filters: BornFilters): Params {
  return {
    [BORN_COUNTRY_QUERY_PARAM]: writeList(filters.countries.map((country: string) => country.toLowerCase())),
    [BORN_OCCUPATION_QUERY_PARAM]: writeList(filters.occupations),
    [BORN_DECADE_QUERY_PARAM]: writeList(filters.decades),
    [BORN_STATUS_QUERY_PARAM]: filters.status === BORN_DEFAULT_FILTERS.status ? null : filters.status,
    [BORN_SORT_QUERY_PARAM]: filters.sort === BORN_DEFAULT_FILTERS.sort ? null : filters.sort,
  };
}

// The sort order does not count: it changes the order, not who is shown.
export function countActiveBornFilters({ countries, occupations, decades, status }: BornFilters): number {
  return [countries.length, occupations.length, decades.length, status !== BORN_DEFAULT_FILTERS.status].filter(Boolean).length;
}

// Filters are equal when they give the same URL.
export function isSameBornFilters(first: BornFilters, second: BornFilters): boolean {
  return JSON.stringify(toBornFilterQueryParams(first)) === JSON.stringify(toBornFilterQueryParams(second));
}

export function toCelebritiesRequest(date: BornDate, filters: BornFilters, locale: AppLocale, offset: number): CelebritiesRequest {
  return { month: date.month, day: date.day, locale, ...filters, offset };
}

function readList<T extends string>(value: string | null | undefined, options: readonly T[]): T[] {
  const values: string[] = value?.split(',') ?? [];

  return options.filter((option: T) => values.includes(option));
}

function writeList(values: string[]): string | null {
  return values.length ? values.join(',') : null;
}
