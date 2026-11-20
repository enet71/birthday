# api-celebrities

Famous people from Wikidata for the public date pages (`/born/<month>/<day>` in the web app).

| Request                | Query                                                                                                                 | Answer                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `GET /api/celebrities` | `month`, `day`; optional `locale`, `countries=US,UA`, `occupations=film,music`, `decades`, `status`, `sort`, `offset` | `CelebritiesResponse`; 400 for bad ones |

No sign-in. The answer is the top `CELEBRITIES_PAGE_SIZE` people of the date among those that match the filters, from
`offset`, and how many match in total: names
and Wikipedia links in `locale` (otherwise English, otherwise Wikidata's `mul` label), ordered by `sort`. `popularity`
ranks by page views of the English article in the last 12 months, then people without one by their sitelinks.

## Import

The import fills the `celebrities` table segment by segment. A segment is a country and a field (`CELEBRITY_SEGMENTS`,
for example `US-film`); a new one is imported after the next deployment.

1. **Segment job.** One SPARQL query to QLever (the Wikidata Query Service when QLever fails) finds everyone of the
   country with an occupation of the field, a day-precise birth date and at least `CELEBRITY_MIN_SITELINKS` sitelinks.
   Each person keeps the keys of the segments that found them (`segments`); a segment that no longer finds a person
   takes its key off, and the person is removed once no key is left. A person found by one field may be shown in
   another, because the field comes from the details (step 2).
2. **Details jobs**, 50 people each, one at a time: names, Wikipedia titles, death date, and the person's field. The
   field is that of the first occupation in Wikidata's order that has one: listed in `CELEBRITY_OCCUPATION_ITEMS`, or a
   subclass of one of `CELEBRITY_OCCUPATION_ROOTS`. People whose field puts them outside every segment are removed.
3. **Page view jobs**: views of the English articles in the last 12 full months, under two requests per second.

Failed jobs retry with growing pauses. `celebrity_imports` keeps every segment's last start, end and error. Requests
send `WIKIMEDIA_USER_AGENT`, as Wikimedia asks.

A new import of one segment, or of all, is queued from the API container:

```bash
docker exec <api-container> node main.js celebrities:import [US-film]
```

The command fails when an import of the segment is already waiting.

The admin page `/admin/imports` shows each segment's status, the progress of details and page views, the job counts
and the latest errors (`GET /api/admin/celebrity-imports`, only for `ADMIN_EMAILS`).
