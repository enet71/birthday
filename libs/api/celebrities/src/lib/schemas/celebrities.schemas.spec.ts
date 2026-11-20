import { ZodError } from 'zod';
import { CelebritiesRequest } from '@birthday/shared-models';
import { celebritiesRequestSchema } from './celebrities.schemas';

describe('celebritiesRequestSchema', () => {
  it('parses the date and fills the defaults', () => {
    expect(celebritiesRequestSchema.parse({ month: '5', day: '17' })).toEqual<CelebritiesRequest>({
      month: 5,
      day: 17,
      locale: 'en',
      countries: [],
      occupations: [],
      decades: [],
      status: 'all',
      sort: 'popularity',
      offset: 0,
    });
  });

  it('parses every parameter', () => {
    const request: CelebritiesRequest = celebritiesRequestSchema.parse({
      month: '2',
      day: '29',
      locale: 'ru',
      countries: 'us,UA',
      occupations: 'film,music',
      decades: '1990,before-1900',
      status: 'living',
      sort: 'oldest',
      offset: '50',
    });

    expect(request).toEqual<CelebritiesRequest>({
      month: 2,
      day: 29,
      locale: 'ru',
      countries: ['US', 'UA'],
      occupations: ['film', 'music'],
      decades: ['1990', 'before-1900'],
      status: 'living',
      sort: 'oldest',
      offset: 50,
    });
  });

  it('treats empty list values as empty lists', () => {
    const request: CelebritiesRequest = celebritiesRequestSchema.parse({ month: '1', day: '1', countries: '', occupations: '', decades: '' });

    expect(request.countries).toEqual([]);
    expect(request.occupations).toEqual([]);
    expect(request.decades).toEqual([]);
  });

  it('removes duplicates from the lists, also after upper-casing the countries', () => {
    const request: CelebritiesRequest = celebritiesRequestSchema.parse({
      month: '1',
      day: '1',
      countries: 'us,US,ua',
      occupations: 'film,film',
      decades: '1990,1990',
    });

    expect(request.countries).toEqual(['US', 'UA']);
    expect(request.occupations).toEqual(['film']);
    expect(request.decades).toEqual(['1990']);
  });

  it.each<[string, Record<string, string>]>([
    ['a day that does not exist in the month', { month: '2', day: '30' }],
    ['a month after December', { month: '13', day: '1' }],
    ['a missing day', { month: '1' }],
    ['an unknown parameter', { month: '1', day: '1', page: '2' }],
    ['a country that is not a two-letter code', { month: '1', day: '1', countries: 'USA' }],
    ['an unknown occupation', { month: '1', day: '1', occupations: 'film,cooking' }],
    ['an unknown locale', { month: '1', day: '1', locale: 'it' }],
    ['an offset over 10000', { month: '1', day: '1', offset: '10001' }],
    ['a negative offset', { month: '1', day: '1', offset: '-1' }],
  ])('rejects %s', (_case: string, query: Record<string, string>) => {
    expect(() => celebritiesRequestSchema.parse(query)).toThrow(ZodError);
  });

  it('rejects a list longer than 50 values', () => {
    const countries: string = Array.from({ length: 51 }, () => 'US').join(',');

    expect(() => celebritiesRequestSchema.parse({ month: '1', day: '1', countries })).toThrow(ZodError);
  });

  it('accepts a list of 50 values and the maximum offset', () => {
    const countries: string = Array.from({ length: 50 }, () => 'US').join(',');

    expect(celebritiesRequestSchema.parse({ month: '1', day: '1', countries, offset: '10000' })).toMatchObject({ countries: ['US'], offset: 10000 });
  });
});
