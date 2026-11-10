import { Route } from '@angular/router';
import { APP_DESCRIPTION_DATA_KEY, APP_LAYOUT, APP_SITE_URL, APP_STRUCTURED_DATA_DATA_KEY } from '../../app.constants';
import { Guide } from './guides.interfaces';

export function getGuidePath(guide: Guide): string {
  return `/guides/${guide.slug}`;
}

export function buildGuideRoute(guide: Guide, loadComponent: Route['loadComponent']): Route {
  return {
    path: guide.slug,
    title: guide.title,
    data: {
      [APP_DESCRIPTION_DATA_KEY]: guide.description,
      [APP_STRUCTURED_DATA_DATA_KEY]: buildGuideStructuredData(guide),
    },
    loadComponent,
  };
}

// The page script holds one object, so the article and its breadcrumbs share a `@graph`.
function buildGuideStructuredData(guide: Guide): object {
  const url = `${APP_SITE_URL}${getGuidePath(guide)}`;
  const organization = { '@type': 'Organization', name: APP_LAYOUT.appName, url: `${APP_SITE_URL}/` };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: guide.title,
        description: guide.description,
        url,
        mainEntityOfPage: url,
        dateModified: guide.updatedAt,
        image: `${APP_SITE_URL}/og-image.png`,
        author: organization,
        publisher: { ...organization, logo: `${APP_SITE_URL}/icon-512.png` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${APP_SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${APP_SITE_URL}/guides` },
          { '@type': 'ListItem', position: 3, name: guide.title, item: url },
        ],
      },
    ],
  };
}
