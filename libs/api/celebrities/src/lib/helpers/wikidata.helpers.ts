import { CELEBRITY_OCCUPATIONS, CelebrityOccupation } from '@birthday/shared-models';
import {
  CELEBRITY_FALLBACK_LABEL_LANGUAGE,
  CELEBRITY_LANGUAGES,
  CELEBRITY_MIN_SITELINKS,
  CELEBRITY_OCCUPATION_ITEMS,
  CELEBRITY_OCCUPATION_ROOTS,
} from '../constants';
import { CelebrityCandidate, CelebrityDetails, CelebritySegment } from '../types';

const ENTITY_URL_PREFIX = 'http://www.wikidata.org/entity/';
const GREGORIAN_CALENDAR = 'Q1985727';
const DAY_PRECISION = 11;
const YEAR_PRECISION = 9;

// The parts of the Wikidata JSON the import reads.
export interface WikidataStatement {
  rank: 'preferred' | 'normal' | 'deprecated';
  mainsnak: { snaktype: string; datavalue?: { value: unknown } };
}

export interface WikidataEntity {
  id: string;
  missing?: string;
  labels?: Record<string, { value: string }>;
  sitelinks?: Record<string, { title: string }>;
  claims?: Record<string, WikidataStatement[]>;
}

export interface SparqlResults {
  results: { bindings: Record<string, { value: string } | undefined>[] };
}

// Everyone of the segment's country who has one of the field's occupations, a day-precise Gregorian birth date and
// enough sitelinks. A preferred birth date wins over the others, like on Wikidata's page. The Wikidata Query Service needs the join order fixed, or it starts from every human and times out;
// QLever plans the query itself and does not know the hint.
export function buildSegmentQuery(segment: CelebritySegment, forQueryService: boolean): string {
  const occupations: string = CELEBRITY_OCCUPATION_ITEMS[segment.occupation].map((item: string) => `wd:${item}`).join(' ');

  return `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX wikibase: <http://wikiba.se/ontology#>
${forQueryService ? 'PREFIX hint: <http://www.bigdata.com/queryHints#>\n' : ''}SELECT ?person (SAMPLE(?preferredTime) AS ?preferredBirth) (SAMPLE(?time) AS ?birth) (SAMPLE(?links) AS ?sitelinks) (GROUP_CONCAT(DISTINCT ?iso; separator=" ") AS ?countries) WHERE {
${forQueryService ? '  hint:Query hint:optimizer "None".\n' : ''}  VALUES ?occupation { ${occupations} }
  ?person wdt:P106 ?occupation.
  ?person wdt:P27 wd:${segment.countryItem}.
  ?person wikibase:sitelinks ?links.
  FILTER(?links >= ${CELEBRITY_MIN_SITELINKS})
  ?person wdt:P31 wd:Q5.
  ?person p:P569 ?statement.
  ?statement wikibase:rank ?rank.
  FILTER(?rank != wikibase:DeprecatedRank)
  ?statement psv:P569 ?value.
  ?value wikibase:timePrecision ${DAY_PRECISION}; wikibase:timeCalendarModel wd:${GREGORIAN_CALENDAR}; wikibase:timeValue ?time.
  BIND(IF(?rank = wikibase:PreferredRank, ?time, ?unbound) AS ?preferredTime)
  OPTIONAL { ?person wdt:P27 ?country. ?country wdt:P297 ?iso. }
}
GROUP BY ?person`;
}

export function parseSegmentResults(results: SparqlResults): CelebrityCandidate[] {
  const candidates: Map<string, CelebrityCandidate> = new Map();

  for (const row of results.results.bindings) {
    const id: string | undefined = row['person']?.value.replace(ENTITY_URL_PREFIX, '');
    const birth: string | undefined = row['preferredBirth']?.value ?? row['birth']?.value;
    const sitelinks = Number(row['sitelinks']?.value);

    // Item ids only; years before 1000 or BC do not fit `yyyy-MM-dd`.
    if (!id || !/^Q\d+$/.test(id) || !birth || !/^\d{4}-\d{2}-\d{2}/.test(birth) || !Number.isInteger(sitelinks)) {
      continue;
    }

    const countries: string[] = (row['countries']?.value ?? '').split(' ').filter((code: string) => /^[A-Z]{2}$/.test(code));

    candidates.set(id, { id, birthDate: birth.slice(0, 10), sitelinks, countries: [...new Set(countries)].sort() });
  }

  return [...candidates.values()];
}

export function parseEntityDetails(entity: WikidataEntity): CelebrityDetails {
  const names: Record<string, string> = {};
  const wikipediaTitles: Record<string, string> = {};

  for (const language of [...CELEBRITY_LANGUAGES, CELEBRITY_FALLBACK_LABEL_LANGUAGE]) {
    const label: string | undefined = entity.labels?.[language]?.value;

    if (label) {
      names[language] = label;
    }
  }

  for (const language of CELEBRITY_LANGUAGES) {
    const title: string | undefined = entity.sitelinks?.[`${language}wiki`]?.title;

    if (title) {
      wikipediaTitles[language] = title;
    }
  }

  return {
    names,
    wikipediaTitles,
    deathDate: readDeathDate(entity.claims?.['P570'] ?? []),
    occupationItems: readItemIds(entity.claims?.['P106'] ?? []),
  };
}

// The field of the first occupation, in Wikidata's order, that has one: an actor who also directs is in film, a designer
// who also acted is in art, an alpine skier who presented a TV show is in sports. `fields` maps occupations to fields.
export function getPrimaryOccupation(occupationItems: string[], fields: ReadonlyMap<string, CelebrityOccupation | null>): CelebrityOccupation | null {
  for (const item of occupationItems) {
    const occupation: CelebrityOccupation | null | undefined = fields.get(item);

    if (occupation) {
      return occupation;
    }
  }

  return null;
}

// The field an occupation is listed in, if any.
export function getListedOccupation(item: string): CelebrityOccupation | null {
  return CELEBRITY_OCCUPATIONS.find((field: CelebrityOccupation) => CELEBRITY_OCCUPATION_ITEMS[field].includes(item)) ?? null;
}

// Which of the field roots each occupation is a subclass of (P279*).
export function buildOccupationRootsQuery(occupationItems: string[]): string {
  const roots: string[] = CELEBRITY_OCCUPATIONS.flatMap((field: CelebrityOccupation) => CELEBRITY_OCCUPATION_ROOTS[field]);

  return `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?occupation ?root WHERE {
  VALUES ?occupation { ${occupationItems.map((item: string) => `wd:${item}`).join(' ')} }
  VALUES ?root { ${roots.map((item: string) => `wd:${item}`).join(' ')} }
  ?occupation wdt:P279* ?root.
}`;
}

// The field of every asked occupation: the listed one, otherwise that of the first matching root in the order of
// `CELEBRITY_OCCUPATIONS`, otherwise `null`.
export function parseOccupationFields(occupationItems: string[], results: SparqlResults): Map<string, CelebrityOccupation | null> {
  const rootsByOccupation: Map<string, Set<string>> = new Map();

  for (const row of results.results.bindings) {
    const occupation: string | undefined = row['occupation']?.value.replace(ENTITY_URL_PREFIX, '');
    const root: string | undefined = row['root']?.value.replace(ENTITY_URL_PREFIX, '');

    if (occupation && root) {
      rootsByOccupation.set(occupation, (rootsByOccupation.get(occupation) ?? new Set()).add(root));
    }
  }

  return new Map(occupationItems.map((item: string) => [item, getListedOccupation(item) ?? findRootField(rootsByOccupation.get(item))]));
}

function findRootField(roots: Set<string> | undefined): CelebrityOccupation | null {
  return (
    CELEBRITY_OCCUPATIONS.find((field: CelebrityOccupation) => CELEBRITY_OCCUPATION_ROOTS[field].some((root: string) => roots?.has(root))) ?? null
  );
}

// The 12 full months before `now`, as the Pageviews API's `yyyyMMdd00` timestamps.
export function getPageviewsPeriod(now: Date): { start: string; end: string } {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const start = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));

  return { start: toPageviewsTimestamp(start), end: toPageviewsTimestamp(end) };
}

function toPageviewsTimestamp(date: Date): string {
  return `${date.toISOString().slice(0, 10).replaceAll('-', '')}00`;
}

// Preferred statements first, deprecated ones never.
function getRankedStatements(statements: WikidataStatement[]): WikidataStatement[] {
  const valid: WikidataStatement[] = statements.filter(
    (statement: WikidataStatement) => statement.rank !== 'deprecated' && statement.mainsnak.snaktype === 'value',
  );
  const preferred: WikidataStatement[] = valid.filter((statement: WikidataStatement) => statement.rank === 'preferred');

  return preferred.length ? preferred : valid;
}

function readItemIds(statements: WikidataStatement[]): string[] {
  return statements
    .filter((statement: WikidataStatement) => statement.rank !== 'deprecated')
    .map((statement: WikidataStatement) => (statement.mainsnak.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((id: string | undefined): id is string => !!id);
}

function readDeathDate(statements: WikidataStatement[]): string | null {
  for (const statement of getRankedStatements(statements)) {
    const value = statement.mainsnak.datavalue?.value as { time?: string; precision?: number } | undefined;
    const match: RegExpMatchArray | null | undefined = value?.time?.match(/^\+(\d{4})-(\d{2})-(\d{2})/);

    if (!match || (value?.precision ?? 0) < YEAR_PRECISION) {
      continue;
    }

    return value?.precision === DAY_PRECISION ? `${match[1]}-${match[2]}-${match[3]}` : `${match[1]}-01-01`;
  }

  return null;
}

// Whether a person of this field and these countries belongs to one of the imported segments.
export function isInSegments(segments: readonly CelebritySegment[], occupation: CelebrityOccupation | null, countries: string[]): boolean {
  return segments.some((segment: CelebritySegment) => segment.occupation === occupation && countries.includes(segment.country));
}
