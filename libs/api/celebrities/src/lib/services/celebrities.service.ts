import { Inject, Injectable } from '@nestjs/common';
import { and, arrayOverlaps, asc, desc, eq, inArray, isNotNull, isNull, or, SQL, sql } from 'drizzle-orm';
import { celebrities, CelebrityTexts, Database, DATABASE } from '@birthday/api-database';
import {
  AppLocale,
  CELEBRITIES_PAGE_SIZE,
  CelebritiesRequest,
  CelebritiesResponse,
  CelebrityDecade,
  CelebrityDto,
  CelebrityOccupation,
} from '@birthday/shared-models';
import { CELEBRITY_FALLBACK_LABEL_LANGUAGE } from '../constants';

type CelebrityRow = Pick<
  typeof celebrities.$inferSelect,
  'id' | 'names' | 'occupation' | 'countries' | 'birthDate' | 'deathDate' | 'wikipediaTitles'
>;

const BIRTH_YEAR: SQL<number> = sql<number>`extract(year from ${celebrities.birthDate})`;

// The public date pages' people: the most popular of a date, or of a date and filters.
@Injectable()
export class CelebritiesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // People appear once their details loaded; until then the import has not decided whether they stay.
  public async findByDate(request: CelebritiesRequest): Promise<CelebritiesResponse> {
    const where: SQL | undefined = and(
      eq(celebrities.birthMonth, request.month),
      eq(celebrities.birthDay, request.day),
      isNotNull(celebrities.detailsLoadedAt),
      isNotNull(celebrities.occupation),
      request.countries.length ? arrayOverlaps(celebrities.countries, request.countries) : undefined,
      request.occupations.length ? inArray(celebrities.occupation, request.occupations) : undefined,
      request.decades.length ? or(...request.decades.map(toDecadeCondition)) : undefined,
      request.status === 'living' ? isNull(celebrities.deathDate) : undefined,
      request.status === 'deceased' ? isNotNull(celebrities.deathDate) : undefined,
    );
    const [rows, total] = await Promise.all([
      this.db
        .select({
          id: celebrities.id,
          names: celebrities.names,
          occupation: celebrities.occupation,
          countries: celebrities.countries,
          birthDate: celebrities.birthDate,
          deathDate: celebrities.deathDate,
          wikipediaTitles: celebrities.wikipediaTitles,
        })
        .from(celebrities)
        .where(where)
        .orderBy(...getOrder(request))
        .limit(CELEBRITIES_PAGE_SIZE)
        .offset(request.offset),
      this.db.$count(celebrities, where),
    ]);

    return { celebrities: rows.map((row: CelebrityRow) => toDto(row, request.locale)), total };
  }
}

function toDecadeCondition(decade: CelebrityDecade): SQL {
  if (decade === 'before-1900') {
    return sql`${BIRTH_YEAR} < 1900`;
  }

  const start = Number(decade);

  return sql`${BIRTH_YEAR} between ${start} and ${start + 9}`;
}

// Popularity: page views of the English article; people without one follow, by their number of sitelinks. The id keeps
// the order stable between pages.
function getOrder({ sort }: CelebritiesRequest): SQL[] {
  switch (sort) {
    case 'youngest':
      return [desc(celebrities.birthDate), asc(celebrities.id)];
    case 'oldest':
      return [asc(celebrities.birthDate), asc(celebrities.id)];
    default:
      return [sql`${celebrities.pageviews} desc nulls last`, desc(celebrities.sitelinks), asc(celebrities.id)];
  }
}

function toDto(row: CelebrityRow, locale: AppLocale): CelebrityDto {
  return {
    id: row.id,
    name: row.names[locale] ?? row.names['en'] ?? row.names[CELEBRITY_FALLBACK_LABEL_LANGUAGE] ?? row.id,
    occupation: row.occupation as CelebrityOccupation,
    countries: row.countries,
    birthDate: row.birthDate,
    deathDate: row.deathDate,
    wikipediaUrl: getWikipediaUrl(row.wikipediaTitles, locale),
  };
}

// The article in the language, otherwise the English one.
function getWikipediaUrl(titles: CelebrityTexts, locale: AppLocale): string | null {
  const language: string | undefined = titles[locale] ? locale : titles['en'] ? 'en' : undefined;

  return language ? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(titles[language].replaceAll(' ', '_'))}` : null;
}
