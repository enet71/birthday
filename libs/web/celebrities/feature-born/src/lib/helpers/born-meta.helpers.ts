import { ActivatedRouteSnapshot } from '@angular/router';
import { CelebritiesResponse, CelebrityDto } from '@birthday/shared-models';
import { AppRouteTranslator } from '@birthday/web-shared-util';
import { BORN_CELEBRITIES_DATA_KEY, BORN_DESCRIPTION_NAME_COUNT } from '../constants';
import { BornDate } from '../types';
import { readBornDate, toReferenceDate } from './born-date.helpers';

export function buildBornDayHeading(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  return translator.translate('born.day.heading', { date: formatRouteDate(translator, route) });
}

export function buildBornDayDocumentTitle(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  return translator.translate('born.day.documentTitle', { date: formatRouteDate(translator, route) });
}

// Lists the first people of the page, so each date gets its own search snippet.
export function buildBornDayDescription(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  const { celebrities, total }: CelebritiesResponse = readRouteCelebrities(route);
  const date: string = formatRouteDate(translator, route);
  const names: string[] = celebrities.slice(0, BORN_DESCRIPTION_NAME_COUNT).map(({ name }) => name);
  const more: number = total - names.length;

  if (!names.length) {
    return translator.translate('born.day.description', { date });
  }

  return more > 0
    ? translator.translatePlural('born.day.descriptionNamesMore', more, { date, names: names.join(', ') })
    : translator.translate('born.day.descriptionNames', { date, names: names.join(', ') });
}

// schema.org list of the people in the order of the page.
export function buildBornDayStructuredData(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): object {
  const { celebrities }: CelebritiesResponse = readRouteCelebrities(route);

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

function readRouteCelebrities(route: ActivatedRouteSnapshot): CelebritiesResponse {
  return route.data[BORN_CELEBRITIES_DATA_KEY] ?? { celebrities: [], total: 0 };
}

function formatRouteDate(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  const date: BornDate | null = readBornDate(route);

  return date ? translator.formatDate(toReferenceDate(date), 'dates.longMonthDay') : '';
}
