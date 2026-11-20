import { Route } from '@angular/router';
import { APP_DESCRIPTION_DATA_KEY, APP_STRUCTURED_DATA_DATA_KEY, AppRouteTranslator } from '@birthday/web-shared-util';
import { APP_LAYOUT, APP_SITE_URL } from '../../app.constants';
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
      [APP_STRUCTURED_DATA_DATA_KEY]: (translator: AppRouteTranslator) => buildGuideStructuredData(guide, translator),
    },
    loadComponent,
  };
}

// The page script holds one object, so the article and its breadcrumbs share a `@graph`.
function buildGuideStructuredData(guide: Guide, translator: AppRouteTranslator): object {
  const url = `${APP_SITE_URL}${getGuidePath(guide)}`;
  const organization = { '@type': 'Organization', name: APP_LAYOUT.appName, url: `${APP_SITE_URL}/` };
  const title: string = translator.translate(guide.title);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: title,
        description: translator.translate(guide.description),
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
          { '@type': 'ListItem', position: 1, name: translator.translate('guides.breadcrumbHome'), item: `${APP_SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: translator.translate('routes.guides.title'), item: `${APP_SITE_URL}/guides` },
          { '@type': 'ListItem', position: 3, name: title, item: url },
        ],
      },
    ],
  };
}
