import { AppLocale } from '../i18n';
import { CelebrityOccupation } from './celebrity.dto';

// Decades of birth, newest first; everyone born before 1900 is one value.
export const CELEBRITY_DECADES = [
  '2020',
  '2010',
  '2000',
  '1990',
  '1980',
  '1970',
  '1960',
  '1950',
  '1940',
  '1930',
  '1920',
  '1910',
  '1900',
  'before-1900',
] as const;

export type CelebrityDecade = (typeof CELEBRITY_DECADES)[number];

export const CELEBRITY_STATUSES = ['all', 'living', 'deceased'] as const;

export type CelebrityStatus = (typeof CELEBRITY_STATUSES)[number];

// `popularity`: views of the English Wikipedia article in the last year.
export const CELEBRITY_SORTS = ['popularity', 'youngest', 'oldest'] as const;

export type CelebritySort = (typeof CELEBRITY_SORTS)[number];

// People per page of `GET /api/celebrities`.
export const CELEBRITIES_PAGE_SIZE = 50;

// `GET /api/celebrities`. Build its query with `toCelebritiesQueryParams`: the lists travel comma-separated
// (`countries=US,UA`). Every field except `month` and `day` is optional in the URL; empty lists do not filter.
export interface CelebritiesRequest {
  // 1–12.
  month: number;
  day: number;
  // The language of the names and the Wikipedia links.
  locale: AppLocale;
  // ISO 3166-1 alpha-2 codes; a person with any of these citizenships matches.
  countries: string[];
  occupations: CelebrityOccupation[];
  decades: CelebrityDecade[];
  status: CelebrityStatus;
  sort: CelebritySort;
  offset: number;
}

// The query parameters of `GET /api/celebrities`; lists are comma-separated, empty ones and default values are left out.
export function toCelebritiesQueryParams(request: CelebritiesRequest): Record<string, string> {
  const params: Record<string, string> = { month: String(request.month), day: String(request.day), locale: request.locale };
  const lists: Record<string, string[]> = { countries: request.countries, occupations: request.occupations, decades: request.decades };

  for (const [key, values] of Object.entries(lists)) {
    if (values.length) {
      params[key] = values.join(',');
    }
  }

  if (request.status !== 'all') {
    params['status'] = request.status;
  }

  if (request.sort !== 'popularity') {
    params['sort'] = request.sort;
  }

  if (request.offset) {
    params['offset'] = String(request.offset);
  }

  return params;
}
