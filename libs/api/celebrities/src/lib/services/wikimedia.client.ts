import { Injectable, Logger } from '@nestjs/common';
import {
  CELEBRITY_FALLBACK_LABEL_LANGUAGE,
  CELEBRITY_LANGUAGES,
  PAGEVIEWS_API_URL,
  QLEVER_SPARQL_URL,
  WDQS_SPARQL_URL,
  WIKIDATA_API_URL,
  WIKIMEDIA_USER_AGENT,
} from '../constants';
import { buildOccupationRootsQuery, buildSegmentQuery, getPageviewsPeriod, SparqlResults, WikidataEntity } from '../helpers';
import { CelebritySegment } from '../types';

// The Wikidata Query Service stops a query after 60 seconds; QLever answers in seconds.
const SPARQL_TIMEOUT_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 30 * 1000;

// Reads Wikidata and Wikipedia page views. Failed requests throw; the jobs retry them later with growing pauses, which
// also keeps the import within Wikimedia's rate limits.
@Injectable()
export class WikimediaClient {
  private readonly logger = new Logger(WikimediaClient.name);

  // QLever first; the Wikidata Query Service when QLever fails.
  public async querySegment(segment: CelebritySegment): Promise<SparqlResults> {
    try {
      return await this.querySparql(QLEVER_SPARQL_URL, buildSegmentQuery(segment, false));
    } catch (error) {
      this.logger.warn({ err: error, segment: segment.key }, 'QLever failed, falling back to the Wikidata Query Service');

      return this.querySparql(WDQS_SPARQL_URL, buildSegmentQuery(segment, true));
    }
  }

  // Which field roots the occupations are subclasses of; QLever first, like the segment query.
  public async queryOccupationRoots(occupationItems: string[]): Promise<SparqlResults> {
    const query: string = buildOccupationRootsQuery(occupationItems);

    try {
      return await this.querySparql(QLEVER_SPARQL_URL, query);
    } catch (error) {
      this.logger.warn({ err: error }, 'QLever failed, falling back to the Wikidata Query Service');

      return this.querySparql(WDQS_SPARQL_URL, query);
    }
  }

  // At most `WIKIDATA_ENTITIES_PER_REQUEST` ids.
  public async getEntities(ids: string[]): Promise<Record<string, WikidataEntity>> {
    const url = new URL(WIKIDATA_API_URL);

    url.search = new URLSearchParams({
      action: 'wbgetentities',
      ids: ids.join('|'),
      props: 'labels|sitelinks|claims',
      languages: [...CELEBRITY_LANGUAGES, CELEBRITY_FALLBACK_LABEL_LANGUAGE].join('|'),
      sitefilter: CELEBRITY_LANGUAGES.map((language: string) => `${language}wiki`).join('|'),
      format: 'json',
      formatversion: '2',
    }).toString();

    const body = (await this.fetchJson(url, REQUEST_TIMEOUT_MS)) as { entities?: Record<string, WikidataEntity>; error?: { info?: string } };

    if (!body.entities) {
      throw new Error(`wbgetentities failed: ${body.error?.info ?? 'no entities'}`);
    }

    return body.entities;
  }

  // Views of an English Wikipedia article in the last 12 full months; `null` when the API knows no views of it.
  public async getYearlyPageviews(title: string, now: Date = new Date()): Promise<number | null> {
    const { start, end } = getPageviewsPeriod(now);
    const article: string = encodeURIComponent(title.replaceAll(' ', '_'));
    const response: Response = await this.fetch(new URL(`${PAGEVIEWS_API_URL}/${article}/monthly/${start}/${end}`), REQUEST_TIMEOUT_MS);

    if (response.status === 404) {
      await response.body?.cancel();
      return null;
    }

    const body = (await this.readJson(response)) as { items?: { views: number }[] };

    return (body.items ?? []).reduce((sum: number, item: { views: number }) => sum + item.views, 0);
  }

  private async querySparql(endpoint: string, query: string): Promise<SparqlResults> {
    const url = new URL(endpoint);

    url.search = new URLSearchParams({ query }).toString();

    const body = (await this.fetchJson(url, SPARQL_TIMEOUT_MS, 'application/sparql-results+json')) as SparqlResults;

    if (!Array.isArray(body?.results?.bindings)) {
      throw new Error(`${endpoint} returned no SPARQL results`);
    }

    return body;
  }

  private async fetchJson(url: URL, timeoutMs: number, accept = 'application/json'): Promise<unknown> {
    return this.readJson(await this.fetch(url, timeoutMs, accept));
  }

  private fetch(url: URL, timeoutMs: number, accept = 'application/json'): Promise<Response> {
    return fetch(url, {
      headers: { 'User-Agent': WIKIMEDIA_USER_AGENT, 'Api-User-Agent': WIKIMEDIA_USER_AGENT, Accept: accept },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  private async readJson(response: Response): Promise<unknown> {
    const text: string = await response.text();

    if (!response.ok) {
      const url = new URL(response.url);

      throw new Error(`${url.origin}${url.pathname} failed: ${response.status} ${text.slice(0, 300)}`);
    }

    return JSON.parse(text);
  }
}
