// Fields that group Wikidata occupations, so one filter covers actors and actresses, singers and composers.
export const CELEBRITY_OCCUPATIONS = ['film', 'music', 'sports', 'literature', 'politics', 'science', 'art', 'business'] as const;

export type CelebrityOccupation = (typeof CELEBRITY_OCCUPATIONS)[number];

// ISO 3166-1 alpha-2 codes of the countries the import covers; it grows with every imported country.
export const CELEBRITY_COUNTRIES = ['US', 'UA'] as const;

export interface CelebrityDto {
  // Wikidata item id, for example `Q42`.
  id: string;
  // In the requested language, otherwise in English, otherwise the label Wikidata shares between all languages,
  // otherwise the Wikidata id.
  name: string;
  // `null` when none of the Wikidata occupations maps to a known group.
  occupation: CelebrityOccupation | null;
  // ISO 3166-1 alpha-2 codes of every citizenship, for example `['US', 'GB']`.
  countries: string[];
  // Dates in the `yyyy-MM-dd` format.
  birthDate: string;
  deathDate: string | null;
  wikipediaUrl: string | null;
}
