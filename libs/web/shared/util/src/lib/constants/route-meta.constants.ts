// Route `data` keys with a page's SEO tags; the app's title strategy applies them on every navigation and language switch.

// Flag that keeps a page with private, user-only content out of search results.
export const APP_NOINDEX_DATA_KEY = 'noindex';

// An `AppRouteText` with a full document title that replaces the default "<route title> · <app name>".
export const APP_DOCUMENT_TITLE_DATA_KEY = 'documentTitle';

// An `AppStructuredDataFactory` whose schema.org object the page adds to the document head as JSON-LD.
export const APP_STRUCTURED_DATA_DATA_KEY = 'structuredData';

// An `AppRouteText` with the page's meta description; pages without one use the app's default description.
export const APP_DESCRIPTION_DATA_KEY = 'description';
