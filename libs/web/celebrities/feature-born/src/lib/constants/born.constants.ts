export const BORN_BASE_PATH = '/born';

// English month names in URLs, the same for every language.
export const BORN_MONTH_SLUGS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

export const BORN_MONTH_PARAM = 'month';
export const BORN_DAY_PARAM = 'day';

// Filter query parameters; list filters keep their values comma-separated, for example `?country=us,ua`.
export const BORN_COUNTRY_QUERY_PARAM = 'country';
export const BORN_OCCUPATION_QUERY_PARAM = 'occupation';
export const BORN_DECADE_QUERY_PARAM = 'decade';
export const BORN_STATUS_QUERY_PARAM = 'status';
export const BORN_SORT_QUERY_PARAM = 'sort';

// Route `data` key with the first page of people the resolver loaded and their total; the page's SEO tags read them.
export const BORN_CELEBRITIES_DATA_KEY = 'celebrities';

// How many names the meta description lists.
export const BORN_DESCRIPTION_NAME_COUNT = 3;
