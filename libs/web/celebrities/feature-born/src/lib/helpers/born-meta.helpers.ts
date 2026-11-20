import { ActivatedRouteSnapshot } from '@angular/router';
import { CelebrityDto } from '@birthday/shared-models';
import { AppRouteTranslator } from '@birthday/web-shared-util';
import { BORN_CELEBRITIES_DATA_KEY } from '../constants';
import { BornDate } from '../types';
import { readBornDate, toReferenceDate } from './born-date.helpers';

export function buildBornDayHeading(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  return translator.translate('born.day.heading', { date: formatRouteDate(translator, route) });
}

export function buildBornDayDocumentTitle(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  return translator.translate('born.day.documentTitle', { date: formatRouteDate(translator, route) });
}

export function buildBornDayDescription(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  return translator.translate('born.day.description', { date: formatRouteDate(translator, route) });
}

// schema.org list of the people in the order of the page.
export function buildBornDayStructuredData(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): object {
  const celebrities: CelebrityDto[] = route.data[BORN_CELEBRITIES_DATA_KEY] ?? [];

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: buildBornDayHeading(translator, route),
    numberOfItems: celebrities.length,
    itemListElement: celebrities.map((celebrity: CelebrityDto, index: number) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Person',
        name: celebrity.name,
        birthDate: celebrity.birthDate,
        ...(celebrity.deathDate && { deathDate: celebrity.deathDate }),
        ...(celebrity.occupation && { jobTitle: translator.translate(`born.occupations.${celebrity.occupation}`) }),
        ...(celebrity.wikipediaUrl && { sameAs: celebrity.wikipediaUrl }),
      },
    })),
  };
}

function formatRouteDate(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  const date: BornDate | null = readBornDate(route);

  return date ? translator.formatDate(toReferenceDate(date), 'dates.longMonthDay') : '';
}
