import { CelebrityOccupation } from '@birthday/shared-models';
import { CelebritySegment } from '../types';
import {
  buildOccupationRootsQuery,
  buildSegmentQuery,
  getListedOccupation,
  getPageviewsPeriod,
  getPrimaryOccupation,
  isInSegments,
  parseEntityDetails,
  parseOccupationFields,
  parseSegmentResults,
  SparqlResults,
  WikidataStatement,
} from './wikidata.helpers';

const ENTITY = 'http://www.wikidata.org/entity/';
// Wikidata items used below: actor (film), singer and musician (music), athlete (sports), painter (art).
const ACTOR = 'Q33999';
const SINGER = 'Q177220';
const MUSICIAN = 'Q639669';
const ATHLETE = 'Q2066131';
const PAINTER = 'Q1028181';
const UNLISTED = 'Q123456789';

const US_FILM: CelebritySegment = { key: 'US-film', countryItem: 'Q30', country: 'US', occupation: 'film' };

function sparql(bindings: Record<string, string>[]): SparqlResults {
  return {
    results: {
      bindings: bindings.map((row: Record<string, string>) =>
        Object.fromEntries(Object.entries(row).map(([key, value]: [string, string]) => [key, { value }])),
      ),
    },
  };
}

function timeStatement(rank: WikidataStatement['rank'], time: string, precision: number): WikidataStatement {
  return { rank, mainsnak: { snaktype: 'value', datavalue: { value: { time, precision } } } };
}

function itemStatement(rank: WikidataStatement['rank'], id: string): WikidataStatement {
  return { rank, mainsnak: { snaktype: 'value', datavalue: { value: { id } } } };
}

describe('wikidata helpers', () => {
  describe('getListedOccupation', () => {
    it('returns the field that lists the occupation', () => {
      expect(getListedOccupation(ACTOR)).toBe('film');
      expect(getListedOccupation(SINGER)).toBe('music');
    });

    it('returns null for an occupation no field lists', () => {
      expect(getListedOccupation(UNLISTED)).toBeNull();
    });
  });

  describe('getPrimaryOccupation', () => {
    it('returns the field of the first occupation in Wikidata order that has one', () => {
      const fields = new Map<string, CelebrityOccupation | null>([
        ['Q1', null],
        ['Q2', 'music'],
        ['Q3', 'film'],
      ]);

      expect(getPrimaryOccupation(['Q0', 'Q1', 'Q2', 'Q3'], fields)).toBe('music');
    });

    it('returns null when no occupation has a field', () => {
      expect(getPrimaryOccupation(['Q0', 'Q1'], new Map([['Q1', null]]))).toBeNull();
    });
  });

  describe('parseOccupationFields', () => {
    it('prefers the listed field over the roots', () => {
      const results: SparqlResults = sparql([{ occupation: `${ENTITY}${ACTOR}`, root: `${ENTITY}${MUSICIAN}` }]);

      expect(parseOccupationFields([ACTOR], results).get(ACTOR)).toBe('film');
    });

    it('takes the first matching root in the order of the fields, whatever the order of the results', () => {
      const results: SparqlResults = sparql([
        { occupation: `${ENTITY}${UNLISTED}`, root: `${ENTITY}${PAINTER}` },
        { occupation: `${ENTITY}${UNLISTED}`, root: `${ENTITY}${ATHLETE}` },
        { occupation: `${ENTITY}${UNLISTED}`, root: `${ENTITY}${MUSICIAN}` },
      ]);

      expect(parseOccupationFields([UNLISTED], results).get(UNLISTED)).toBe('music');
    });

    it('maps an occupation without listed field or matching root to null', () => {
      const results: SparqlResults = sparql([{ occupation: `${ENTITY}Q1`, root: `${ENTITY}${ATHLETE}` }]);

      expect(parseOccupationFields([UNLISTED, 'Q1'], results)).toEqual(
        new Map<string, CelebrityOccupation | null>([
          [UNLISTED, null],
          ['Q1', 'sports'],
        ]),
      );
    });
  });

  describe('buildOccupationRootsQuery', () => {
    it('asks for the given occupations and every field root', () => {
      const query: string = buildOccupationRootsQuery(['Q1', 'Q2']);

      expect(query).toContain('VALUES ?occupation { wd:Q1 wd:Q2 }');
      expect(query).toContain(`wd:${ACTOR}`);
      expect(query).toContain('wd:Q3391743');
      expect(query).toContain('?occupation wdt:P279* ?root.');
    });
  });

  describe('isInSegments', () => {
    it('matches a person of a segment field and country', () => {
      expect(isInSegments([US_FILM], 'film', ['GB', 'US'])).toBe(true);
    });

    it('does not match another field, another country or no field', () => {
      expect(isInSegments([US_FILM], 'music', ['US'])).toBe(false);
      expect(isInSegments([US_FILM], 'film', ['GB'])).toBe(false);
      expect(isInSegments([US_FILM], null, ['US'])).toBe(false);
    });
  });

  describe('parseSegmentResults', () => {
    it('strips the entity URL and keeps the date part of the birth time', () => {
      const results: SparqlResults = sparql([{ person: `${ENTITY}Q1`, birth: '1970-05-17T00:00:00Z', sitelinks: '42', countries: 'US' }]);

      expect(parseSegmentResults(results)).toEqual([{ id: 'Q1', birthDate: '1970-05-17', sitelinks: 42, countries: ['US'] }]);
    });

    it('prefers the preferred birth date over the others', () => {
      const results: SparqlResults = sparql([
        { person: `${ENTITY}Q1`, preferredBirth: '1971-01-02T00:00:00Z', birth: '1970-05-17T00:00:00Z', sitelinks: '42' },
      ]);

      expect(parseSegmentResults(results)[0].birthDate).toBe('1971-01-02');
    });

    it('skips rows with a non-item id, a malformed date or non-integer sitelinks', () => {
      const results: SparqlResults = sparql([
        { person: `${ENTITY}P31`, birth: '1970-05-17T00:00:00Z', sitelinks: '42' },
        { person: 'http://www.wikidata.org/.well-known/genid/abc', birth: '1970-05-17T00:00:00Z', sitelinks: '42' },
        { person: `${ENTITY}Q2`, birth: '-0100-05-17T00:00:00Z', sitelinks: '42' },
        { person: `${ENTITY}Q3`, birth: '812-05-17T00:00:00Z', sitelinks: '42' },
        { person: `${ENTITY}Q4`, sitelinks: '42' },
        { person: `${ENTITY}Q5`, birth: '1970-05-17T00:00:00Z', sitelinks: '4.5' },
        { person: `${ENTITY}Q6`, birth: '1970-05-17T00:00:00Z' },
        { birth: '1970-05-17T00:00:00Z', sitelinks: '42' },
      ]);

      expect(parseSegmentResults(results)).toEqual([]);
    });

    it('keeps one candidate per person', () => {
      const results: SparqlResults = sparql([
        { person: `${ENTITY}Q1`, birth: '1970-05-17T00:00:00Z', sitelinks: '42' },
        { person: `${ENTITY}Q1`, birth: '1970-05-17T00:00:00Z', sitelinks: '43' },
      ]);

      expect(parseSegmentResults(results)).toEqual([{ id: 'Q1', birthDate: '1970-05-17', sitelinks: 43, countries: [] }]);
    });

    it('keeps only two-letter country codes, sorted and unique', () => {
      const results: SparqlResults = sparql([
        { person: `${ENTITY}Q1`, birth: '1970-05-17T00:00:00Z', sitelinks: '42', countries: 'US GB USA us US  GB' },
      ]);

      expect(parseSegmentResults(results)[0].countries).toEqual(['GB', 'US']);
    });
  });

  describe('parseEntityDetails', () => {
    it('keeps the labels of the app languages and mul, and the Wikipedia titles of the app languages', () => {
      const details = parseEntityDetails({
        id: 'Q1',
        labels: { en: { value: 'Jane' }, ru: { value: 'Джейн' }, mul: { value: 'Jane M' }, it: { value: 'Gianna' } },
        sitelinks: {
          enwiki: { title: 'Jane Doe' },
          dewiki: { title: 'Jane Doe (Schauspielerin)' },
          itwiki: { title: 'Gianna' },
          enwikiquote: { title: 'Jane Doe' },
          mulwiki: { title: 'Jane' },
        },
      });

      expect(details.names).toEqual({ en: 'Jane', ru: 'Джейн', mul: 'Jane M' });
      expect(details.wikipediaTitles).toEqual({ en: 'Jane Doe', de: 'Jane Doe (Schauspielerin)' });
    });

    it('returns empty details for an entity without labels, sitelinks or claims', () => {
      expect(parseEntityDetails({ id: 'Q1' })).toEqual({ names: {}, wikipediaTitles: {}, deathDate: null, occupationItems: [] });
    });

    it('reads a day-precise death date', () => {
      const details = parseEntityDetails({ id: 'Q1', claims: { P570: [timeStatement('normal', '+2001-09-11T00:00:00Z', 11)] } });

      expect(details.deathDate).toBe('2001-09-11');
    });

    it('reads a year-precise death date as January 1', () => {
      const details = parseEntityDetails({ id: 'Q1', claims: { P570: [timeStatement('normal', '+2001-00-00T00:00:00Z', 9)] } });

      expect(details.deathDate).toBe('2001-01-01');
    });

    it('ignores death dates less precise than a year', () => {
      const details = parseEntityDetails({ id: 'Q1', claims: { P570: [timeStatement('normal', '+2000-00-00T00:00:00Z', 8)] } });

      expect(details.deathDate).toBeNull();
    });

    it('takes the next statement when the first is less precise than a year', () => {
      const details = parseEntityDetails({
        id: 'Q1',
        claims: { P570: [timeStatement('normal', '+2000-00-00T00:00:00Z', 8), timeStatement('normal', '+2003-04-05T00:00:00Z', 11)] },
      });

      expect(details.deathDate).toBe('2003-04-05');
    });

    it('prefers a preferred death date and ignores deprecated ones', () => {
      const details = parseEntityDetails({
        id: 'Q1',
        claims: {
          P570: [
            timeStatement('deprecated', '+1999-01-01T00:00:00Z', 11),
            timeStatement('normal', '+2000-02-02T00:00:00Z', 11),
            timeStatement('preferred', '+2001-03-03T00:00:00Z', 11),
          ],
        },
      });

      expect(details.deathDate).toBe('2001-03-03');
    });

    it('has no death date when every statement is deprecated or without a value', () => {
      const details = parseEntityDetails({
        id: 'Q1',
        claims: { P570: [timeStatement('deprecated', '+1999-01-01T00:00:00Z', 11), { rank: 'preferred', mainsnak: { snaktype: 'somevalue' } }] },
      });

      expect(details.deathDate).toBeNull();
    });

    it('keeps occupation items in Wikidata order without deprecated ones', () => {
      const details = parseEntityDetails({
        id: 'Q1',
        claims: {
          P106: [
            itemStatement('normal', SINGER),
            itemStatement('deprecated', PAINTER),
            itemStatement('preferred', ACTOR),
            { rank: 'normal', mainsnak: { snaktype: 'novalue' } },
          ],
        },
      });

      expect(details.occupationItems).toEqual([SINGER, ACTOR]);
    });
  });

  describe('buildSegmentQuery', () => {
    it('builds the QLever query without the optimizer hint', () => {
      const query: string = buildSegmentQuery(US_FILM, false);

      expect(query).not.toContain('hint:');
    });

    it('builds the Query Service query with the optimizer hint', () => {
      const query: string = buildSegmentQuery(US_FILM, true);

      expect(query).toContain('PREFIX hint: <http://www.bigdata.com/queryHints#>');
      expect(query).toContain('hint:Query hint:optimizer "None".');
    });

    it.each([false, true])(
      'filters by the country, the field occupations and the minimum sitelinks (query service: %s)',
      (forQueryService: boolean) => {
        const query: string = buildSegmentQuery(US_FILM, forQueryService);

        expect(query).toContain('?person wdt:P27 wd:Q30.');
        expect(query).toContain(`wd:${ACTOR} `);
        expect(query).toContain('FILTER(?links >= 10)');
        expect(query).toContain('BIND(IF(?rank = wikibase:PreferredRank, ?time, ?unbound) AS ?preferredTime)');
      },
    );
  });

  describe('getPageviewsPeriod', () => {
    it('covers the 12 full months before now', () => {
      expect(getPageviewsPeriod(new Date('2026-11-19T10:00:00Z'))).toEqual({ start: '2025110100', end: '2026103100' });
    });

    it('ends in the previous year in January', () => {
      expect(getPageviewsPeriod(new Date('2026-01-15T10:00:00Z'))).toEqual({ start: '2025010100', end: '2025123100' });
    });

    it('ends on the last day of February', () => {
      expect(getPageviewsPeriod(new Date('2028-03-01T00:00:00Z'))).toEqual({ start: '2027030100', end: '2028022900' });
    });
  });
});
