import { Route } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { APP_LAYOUT_HEADING_DATA_KEY } from '@birthday/web-layout-util';
import { APP_DESCRIPTION_DATA_KEY, APP_DOCUMENT_TITLE_DATA_KEY, APP_STRUCTURED_DATA_DATA_KEY } from '@birthday/web-shared-util';
import { BornDayPageComponent } from './components';
import { BORN_CELEBRITIES_DATA_KEY, BORN_DAY_PARAM, BORN_MONTH_PARAM } from './constants';
import { bornDateGuard } from './guards';
import {
  buildBornDayDescription,
  buildBornDayDocumentTitle,
  buildBornDayHeading,
  buildBornDayStructuredData,
  getBornDayPath,
  toBornDate,
} from './helpers';
import { bornDayResolver } from './resolvers';
import { BornDayController, BornDayState } from './state';

export const BORN_ROUTES: Route[] = [
  {
    // The section opens on today's date.
    path: '',
    pathMatch: 'full',
    redirectTo: () => getBornDayPath(toBornDate(new Date())),
  },
  {
    path: `:${BORN_MONTH_PARAM}/:${BORN_DAY_PARAM}`,
    canMatch: [bornDateGuard],
    component: BornDayPageComponent,
    providers: [BornDayState, BornDayController, provideNativeDateAdapter()],
    // The filters live in the query, so the resolver also passes them to the State.
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    resolve: { [BORN_CELEBRITIES_DATA_KEY]: bornDayResolver },
    title: 'routes.born.title',
    data: {
      [APP_DOCUMENT_TITLE_DATA_KEY]: buildBornDayDocumentTitle,
      [APP_LAYOUT_HEADING_DATA_KEY]: buildBornDayHeading,
      [APP_DESCRIPTION_DATA_KEY]: buildBornDayDescription,
      [APP_STRUCTURED_DATA_DATA_KEY]: buildBornDayStructuredData,
    },
  },
];
