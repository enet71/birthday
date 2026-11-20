import type { Mock } from 'vitest';
import { Test } from '@nestjs/testing';
import { DATABASE } from '@birthday/api-database';
import { CELEBRITIES_PAGE_SIZE, CelebritiesRequest } from '@birthday/shared-models';
import { CelebritiesService } from './celebrities.service';

interface CelebrityRowStub {
  id: string;
  names: Record<string, string>;
  occupation: string;
  countries: string[];
  birthDate: string;
  deathDate: string | null;
  wikipediaTitles: Record<string, string>;
}

const REQUEST: CelebritiesRequest = {
  month: 5,
  day: 17,
  locale: 'de',
  countries: [],
  occupations: [],
  decades: [],
  status: 'all',
  sort: 'popularity',
  offset: 100,
};

function row(overrides: Partial<CelebrityRowStub>): CelebrityRowStub {
  return {
    id: 'Q1',
    names: {},
    occupation: 'film',
    countries: ['US'],
    birthDate: '1970-05-17',
    deathDate: null,
    wikipediaTitles: {},
    ...overrides,
  };
}

// The Drizzle query is not unit-testable without a database, so a minimal chain stands in for
// `select().from().where().orderBy().limit().offset()` and `$count()`; the spec checks the mapping and paging.
describe('CelebritiesService', () => {
  let service: CelebritiesService;
  const query: { from: Mock; where: Mock; orderBy: Mock; limit: Mock; offset: Mock } = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  const db: { select: Mock; $count: Mock } = { select: vi.fn(), $count: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    db.select.mockReturnValue(query);
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.offset.mockResolvedValue([]);
    db.$count.mockResolvedValue(0);

    const moduleRef = await Test.createTestingModule({
      providers: [CelebritiesService, { provide: DATABASE, useValue: db }],
    }).compile();

    service = moduleRef.get(CelebritiesService);
  });

  function respondWith(rows: CelebrityRowStub[], total = rows.length): void {
    query.offset.mockResolvedValue(rows);
    db.$count.mockResolvedValue(total);
  }

  it('returns a page of people and the total of the date', async () => {
    respondWith([row({ id: 'Q1', names: { de: 'Erika' }, deathDate: '2001-09-11' })], 120);

    const response = await service.findByDate(REQUEST);

    expect(response).toEqual({
      celebrities: [
        { id: 'Q1', name: 'Erika', occupation: 'film', countries: ['US'], birthDate: '1970-05-17', deathDate: '2001-09-11', wikipediaUrl: null },
      ],
      total: 120,
    });
  });

  it('reads one page at the requested offset', async () => {
    await service.findByDate(REQUEST);

    expect(query.limit).toHaveBeenCalledWith(CELEBRITIES_PAGE_SIZE);
    expect(query.offset).toHaveBeenCalledWith(100);
  });

  it.each<[string, Record<string, string>, string]>([
    ['the locale', { de: 'Erika', en: 'Erica', mul: 'Erica M' }, 'Erika'],
    ['English without the locale', { en: 'Erica', mul: 'Erica M' }, 'Erica'],
    ['mul without the locale and English', { fr: 'Érica', mul: 'Erica M' }, 'Erica M'],
    ['the id without any of them', { fr: 'Érica' }, 'Q7'],
  ])('names a person in %s', async (_case: string, names: Record<string, string>, name: string) => {
    respondWith([row({ id: 'Q7', names })]);

    const response = await service.findByDate(REQUEST);

    expect(response.celebrities[0].name).toBe(name);
  });

  it.each<[string, Record<string, string>, string | null]>([
    ['the article in the locale', { de: 'Erika Muster', en: 'Erica Sample' }, 'https://de.wikipedia.org/wiki/Erika_Muster'],
    ['the English article without one in the locale', { en: 'Erica Sample', fr: 'Érica' }, 'https://en.wikipedia.org/wiki/Erica_Sample'],
    ['no article without the locale and English', { fr: 'Érica' }, null],
  ])('links %s', async (_case: string, wikipediaTitles: Record<string, string>, url: string | null) => {
    respondWith([row({ wikipediaTitles })]);

    const response = await service.findByDate(REQUEST);

    expect(response.celebrities[0].wikipediaUrl).toBe(url);
  });

  it('encodes the article title and replaces spaces with underscores', async () => {
    respondWith([row({ wikipediaTitles: { de: 'Jürgen Prochnow (Schauspieler)/A&B?' } })]);

    const response = await service.findByDate(REQUEST);

    expect(response.celebrities[0].wikipediaUrl).toBe('https://de.wikipedia.org/wiki/J%C3%BCrgen_Prochnow_(Schauspieler)%2FA%26B%3F');
  });
});
