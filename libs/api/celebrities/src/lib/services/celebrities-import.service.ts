import { Inject, Injectable } from '@nestjs/common';
import { and, arrayContains, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { setTimeout as delay } from 'node:timers/promises';
import { celebrities, celebrityImports, Database, DATABASE } from '@birthday/api-database';
import { CELEBRITY_SEGMENTS } from '../constants';
import { CelebrityOccupation } from '@birthday/shared-models';
import { CelebrityDetails, CelebritySegment } from '../types';
import {
  getListedOccupation,
  getPrimaryOccupation,
  isInSegments,
  parseEntityDetails,
  parseOccupationFields,
  parseSegmentResults,
  WikidataEntity,
} from '../helpers';
import { WikimediaClient } from './wikimedia.client';

// Postgres limits a statement to 65,535 parameters; also the batch size of deletes.
const ROWS_PER_INSERT = 1000;
// Spreads the page view requests out, well below Wikimedia's rate limit; 200 ms ran into it on a large import.
const PAGEVIEWS_REQUEST_PAUSE_MS = 500;

// The steps of a celebrity import: the segment's people, then their details, then the page views of their articles.
@Injectable()
export class CelebritiesImportService {
  // Fields of the occupations met so far; few occupations repeat across thousands of people.
  private readonly occupationFields: Map<string, CelebrityOccupation | null> = new Map();

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly wikimedia: WikimediaClient,
  ) {}

  // Only a finished import counts: a failed or interrupted first import is retried by the job that started it.
  public async wasImported(segmentKey: string): Promise<boolean> {
    const rows = await this.db
      .select({ segment: celebrityImports.segment })
      .from(celebrityImports)
      .where(and(eq(celebrityImports.segment, segmentKey), isNotNull(celebrityImports.finishedAt)));

    return rows.length > 0;
  }

  // Saves the segment's people and returns their ids. The row in `celebrity_imports` keeps the start, the end, and the
  // last error.
  public async importSegment(segmentKey: string): Promise<string[]> {
    const segment = CELEBRITY_SEGMENTS.find(({ key }) => key === segmentKey);

    if (!segment) {
      throw new Error(`Unknown celebrity segment ${segmentKey}`);
    }

    const startedAt = new Date();

    await this.db
      .insert(celebrityImports)
      .values({ segment: segment.key, startedAt })
      .onConflictDoUpdate({ target: celebrityImports.segment, set: { startedAt, finishedAt: null, people: null, error: null } });

    try {
      const candidates = parseSegmentResults(await this.wikimedia.querySegment(segment));

      for (let index = 0; index < candidates.length; index += ROWS_PER_INSERT) {
        const rows = candidates.slice(index, index + ROWS_PER_INSERT).map((candidate) => ({
          id: candidate.id,
          birthDate: candidate.birthDate,
          birthMonth: Number(candidate.birthDate.slice(5, 7)),
          birthDay: Number(candidate.birthDate.slice(8, 10)),
          countries: candidate.countries,
          sitelinks: candidate.sitelinks,
          segments: [segment.key],
        }));

        await this.db
          .insert(celebrities)
          .values(rows)
          .onConflictDoUpdate({
            target: celebrities.id,
            set: {
              birthDate: sql`excluded.birth_date`,
              birthMonth: sql`excluded.birth_month`,
              birthDay: sql`excluded.birth_day`,
              countries: sql`excluded.countries`,
              sitelinks: sql`excluded.sitelinks`,
              // In one statement, so that segments imported at the same time do not overwrite each other's key.
              segments: sql`case when ${segment.key} = any(${celebrities.segments}) then ${celebrities.segments} else array_append(${celebrities.segments}, ${segment.key}) end`,
            },
          });
      }

      await this.removeLeftSegment(segment, new Set(candidates.map(({ id }) => id)));
      await this.db
        .update(celebrityImports)
        .set({ finishedAt: new Date(), people: candidates.length })
        .where(eq(celebrityImports.segment, segment.key));

      return candidates.map(({ id }) => id);
    } catch (error) {
      await this.db
        .update(celebrityImports)
        .set({ error: error instanceof Error ? error.message.slice(0, 1000) : String(error) })
        .where(eq(celebrityImports.segment, segment.key));
      throw error;
    }
  }

  // Loads names, articles, death dates and fields of up to 50 people. People whose field puts them outside every
  // segment (a designer or a skier found among the actors) and items deleted in Wikidata are removed. Returns the ids
  // kept.
  public async loadDetails(ids: string[]): Promise<string[]> {
    const entities: Record<string, WikidataEntity> = await this.wikimedia.getEntities(ids);
    const rows = await this.db.select({ id: celebrities.id, countries: celebrities.countries }).from(celebrities).where(inArray(celebrities.id, ids));
    const details: Map<string, CelebrityDetails> = new Map();

    for (const row of rows) {
      const entity: WikidataEntity | undefined = entities[row.id];

      if (entity && !entity.missing && entity.id === row.id) {
        details.set(row.id, parseEntityDetails(entity));
      }
    }

    await this.resolveOccupationFields([...details.values()].flatMap(({ occupationItems }) => occupationItems));

    const kept: string[] = [];
    const removed: string[] = [];

    for (const row of rows) {
      const person: CelebrityDetails | undefined = details.get(row.id);
      const occupation: CelebrityOccupation | null = person ? getPrimaryOccupation(person.occupationItems, this.occupationFields) : null;

      if (!person || !isInSegments(CELEBRITY_SEGMENTS, occupation, row.countries)) {
        removed.push(row.id);
        continue;
      }

      await this.db
        .update(celebrities)
        .set({ names: person.names, wikipediaTitles: person.wikipediaTitles, deathDate: person.deathDate, occupation, detailsLoadedAt: new Date() })
        .where(eq(celebrities.id, row.id));
      kept.push(row.id);
    }

    if (removed.length) {
      await this.db.delete(celebrities).where(inArray(celebrities.id, removed));
    }

    return kept;
  }

  // Takes the segment off the people its query no longer finds: their sitelinks, citizenship, birth date or occupation
  // changed, or the item was deleted. A person is removed once no segment finds them; the segments are matched by the
  // query's occupations, not by the field the details assign, so a person may be found by one field and shown in another.
  private async removeLeftSegment(segment: CelebritySegment, candidateIds: ReadonlySet<string>): Promise<void> {
    const rows = await this.db
      .select({ id: celebrities.id })
      .from(celebrities)
      .where(arrayContains(celebrities.segments, [segment.key]));
    const left: string[] = rows.map(({ id }) => id).filter((id: string) => !candidateIds.has(id));

    for (let index = 0; index < left.length; index += ROWS_PER_INSERT) {
      const ids: string[] = left.slice(index, index + ROWS_PER_INSERT);

      await this.db
        .update(celebrities)
        .set({ segments: sql`array_remove(${celebrities.segments}, ${segment.key})` })
        .where(inArray(celebrities.id, ids));
      await this.db.delete(celebrities).where(and(inArray(celebrities.id, ids), eq(sql`cardinality(${celebrities.segments})`, 0)));
    }
  }

  // Listed occupations need no query; the others are classified once through their Wikidata superclasses.
  private async resolveOccupationFields(occupationItems: string[]): Promise<void> {
    const unknown: string[] = [...new Set(occupationItems)].filter((item: string) => !this.occupationFields.has(item));
    const unlisted: string[] = [];

    for (const item of unknown) {
      const listed: CelebrityOccupation | null = getListedOccupation(item);

      if (listed) {
        this.occupationFields.set(item, listed);
      } else {
        unlisted.push(item);
      }
    }

    if (unlisted.length) {
      for (const [item, field] of parseOccupationFields(unlisted, await this.wikimedia.queryOccupationRoots(unlisted))) {
        this.occupationFields.set(item, field);
      }
    }
  }

  // Page views of the English articles, one request at a time. People without an English article keep `null` and rank
  // by their sitelinks.
  public async loadPageviews(ids: string[]): Promise<void> {
    const rows = await this.db
      .select({ id: celebrities.id, titles: celebrities.wikipediaTitles })
      .from(celebrities)
      .where(inArray(celebrities.id, ids));

    for (const row of rows) {
      const title: string | undefined = row.titles['en'];
      const pageviews: number | null = title ? await this.wikimedia.getYearlyPageviews(title) : null;

      await this.db.update(celebrities).set({ pageviews, pageviewsLoadedAt: new Date() }).where(eq(celebrities.id, row.id));
      await delay(PAGEVIEWS_REQUEST_PAUSE_MS);
    }
  }
}
