export interface Guide {
  slug: string;
  title: string;
  description: string;
  // ISO date shown on the page and used as `dateModified`; update `lastmod` in `sitemap.xml` by hand.
  updatedAt: string;
}
