import { APP_LOCALES, AppLocale, CelebrityOccupation } from '@birthday/shared-models';
import { CelebritySegment } from '../types';

// The people the import covers: one segment per country and field. A new entry is imported after the next deployment.
export const CELEBRITY_SEGMENTS: readonly CelebritySegment[] = [
  { key: 'US-film', countryItem: 'Q30', country: 'US', occupation: 'film' },
  { key: 'US-music', countryItem: 'Q30', country: 'US', occupation: 'music' },
  { key: 'US-sports', countryItem: 'Q30', country: 'US', occupation: 'sports' },
  { key: 'US-literature', countryItem: 'Q30', country: 'US', occupation: 'literature' },
  { key: 'US-politics', countryItem: 'Q30', country: 'US', occupation: 'politics' },
  { key: 'US-science', countryItem: 'Q30', country: 'US', occupation: 'science' },
  { key: 'US-art', countryItem: 'Q30', country: 'US', occupation: 'art' },
  { key: 'US-business', countryItem: 'Q30', country: 'US', occupation: 'business' },
  { key: 'UA-film', countryItem: 'Q212', country: 'UA', occupation: 'film' },
  { key: 'UA-music', countryItem: 'Q212', country: 'UA', occupation: 'music' },
  { key: 'UA-sports', countryItem: 'Q212', country: 'UA', occupation: 'sports' },
  { key: 'UA-literature', countryItem: 'Q212', country: 'UA', occupation: 'literature' },
  { key: 'UA-politics', countryItem: 'Q212', country: 'UA', occupation: 'politics' },
  { key: 'UA-science', countryItem: 'Q212', country: 'UA', occupation: 'science' },
  { key: 'UA-art', countryItem: 'Q212', country: 'UA', occupation: 'art' },
  { key: 'UA-business', countryItem: 'Q212', country: 'UA', occupation: 'business' },
];

// Wikidata occupations (P106) of every field. An occupation listed here belongs to its field directly.
export const CELEBRITY_OCCUPATION_ITEMS: Record<CelebrityOccupation, readonly string[]> = {
  // actor, film actor, television actor, voice actor, stage actor, film director, screenwriter, film producer,
  // television presenter, comedian, television producer, filmmaker
  film: ['Q33999', 'Q10800557', 'Q10798782', 'Q2405480', 'Q2259451', 'Q2526255', 'Q28389', 'Q3282637', 'Q947873', 'Q245068', 'Q578109', 'Q1414443'],
  // singer, musician, singer-songwriter, rapper, composer, guitarist, pianist, record producer, songwriter, disc jockey,
  // drummer, conductor, vocalist
  music: [
    'Q177220',
    'Q639669',
    'Q488205',
    'Q2252262',
    'Q36834',
    'Q855091',
    'Q486748',
    'Q183945',
    'Q753110',
    'Q130857',
    'Q386854',
    'Q158852',
    'Q2643890',
  ],
  // athlete, association football player, basketball player, American football player, baseball player, ice hockey
  // player, tennis player, boxer, racing driver, swimmer, sport cyclist, golfer, mixed martial arts fighter, professional
  // wrestler, athletics competitor, chess player, fencer, volleyball player
  sports: [
    'Q2066131',
    'Q937857',
    'Q3665646',
    'Q19204627',
    'Q10871364',
    'Q11774891',
    'Q10833314',
    'Q11338576',
    'Q378622',
    'Q10843402',
    'Q2309784',
    'Q11303721',
    'Q11607585',
    'Q13474373',
    'Q11513337',
    'Q10873124',
    'Q13381863',
    'Q15117302',
  ],
  // writer, novelist, poet, author, playwright, journalist, essayist, children's writer, translator
  literature: ['Q36180', 'Q6625963', 'Q49757', 'Q482980', 'Q214917', 'Q1930187', 'Q11774202', 'Q4853732', 'Q333634'],
  // politician, diplomat, lawyer, judge, statesperson, president
  politics: ['Q82955', 'Q193391', 'Q40348', 'Q16533', 'Q372436', 'Q30461'],
  // scientist, physicist, chemist, mathematician, biologist, astronomer, engineer, physician, economist, inventor,
  // computer scientist, astronaut, philosopher
  science: ['Q901', 'Q169470', 'Q593644', 'Q170790', 'Q864503', 'Q11063', 'Q81096', 'Q39631', 'Q188094', 'Q205375', 'Q82594', 'Q11631', 'Q4964182'],
  // painter, sculptor, photographer, architect, designer, fashion designer, illustrator, artist, dancer, choreographer,
  // cartoonist, model
  art: ['Q1028181', 'Q1281618', 'Q33231', 'Q42973', 'Q5322166', 'Q3501317', 'Q644687', 'Q483501', 'Q5716684', 'Q2490358', 'Q1114448', 'Q4610556'],
  // businessperson, entrepreneur, chief executive officer, investor, banker, business executive
  business: ['Q43845', 'Q131524', 'Q484876', 'Q557880', 'Q806798', 'Q2961975'],
};

// An occupation that is not listed above belongs to the field of the first of these it is a subclass of (P279), in the
// order of `CELEBRITY_OCCUPATIONS`: an alpine skier is an athlete, a rapper a singer. Broad classes such as artist are left
// out, because almost every performer is a subclass of them.
export const CELEBRITY_OCCUPATION_ROOTS: Record<CelebrityOccupation, readonly string[]> = {
  // actor, film director, television presenter, comedian
  film: ['Q33999', 'Q2526255', 'Q947873', 'Q245068'],
  // musician, singer, composer
  music: ['Q639669', 'Q177220', 'Q36834'],
  // athlete, sportsperson
  sports: ['Q2066131', 'Q50995749'],
  // writer, journalist
  literature: ['Q36180', 'Q1930187'],
  // politician, diplomat, lawyer
  politics: ['Q82955', 'Q193391', 'Q40348'],
  // scientist, physician, engineer
  science: ['Q901', 'Q39631', 'Q81096'],
  // painter, architect, designer, photographer, dancer, model, visual artist
  art: ['Q1028181', 'Q42973', 'Q5322166', 'Q33231', 'Q5716684', 'Q4610556', 'Q3391743'],
  // businessperson, entrepreneur
  business: ['Q43845', 'Q131524'],
};

// The languages of the web app; `mul` is the label Wikidata shares between all languages.
export const CELEBRITY_LANGUAGES: readonly AppLocale[] = APP_LOCALES;
export const CELEBRITY_FALLBACK_LABEL_LANGUAGE = 'mul';

// People with articles on fewer Wikimedia sites are left out.
export const CELEBRITY_MIN_SITELINKS = 10;

// Wikimedia asks automated clients to name themselves and give a contact.
export const WIKIMEDIA_USER_AGENT = 'Birthdly/1.0 (https://birthdly.com; birthdly.support@gmail.com)';
// QLever answers the segment query in seconds; the Wikidata Query Service is the fallback and needs much longer.
export const QLEVER_SPARQL_URL = 'https://qlever.dev/api/wikidata';
export const WDQS_SPARQL_URL = 'https://query.wikidata.org/sparql';
export const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
export const PAGEVIEWS_API_URL = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user';
// `wbgetentities` returns at most 50 items per request.
export const WIKIDATA_ENTITIES_PER_REQUEST = 50;

export const CELEBRITIES_SEGMENT_QUEUE = 'celebrities-segment';
export const CELEBRITIES_DETAILS_QUEUE = 'celebrities-details';
export const CELEBRITIES_PAGEVIEWS_QUEUE = 'celebrities-pageviews';

// The command that queues a new import in the API container: `node main.js celebrities:import [segment]`.
export const CELEBRITIES_IMPORT_COMMAND = 'celebrities:import';
