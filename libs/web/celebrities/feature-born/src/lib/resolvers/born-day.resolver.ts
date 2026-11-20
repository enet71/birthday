import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CelebritiesResponse } from '@birthday/shared-models';
import { readBornDate, readBornFilters } from '../helpers';
import { BornDayController } from '../state';
import { BornDate } from '../types';

// Loads the people before the page activates, so the server-rendered description and JSON-LD already list them.
export const bornDayResolver: ResolveFn<CelebritiesResponse> = (route: ActivatedRouteSnapshot): Observable<CelebritiesResponse> => {
  const date: BornDate | null = readBornDate(route);

  return date ? inject(BornDayController).openDay(date, readBornFilters(route.queryParamMap)) : of({ celebrities: [], total: 0 });
};
