import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { CelebrityDto } from '@birthday/shared-models';
import { readBornDate, readBornFilters } from '../helpers';
import { BornDayController } from '../state';
import { BornDate } from '../types';

// Loads the people before the page activates, so the server-rendered JSON-LD already lists them.
export const bornDayResolver: ResolveFn<CelebrityDto[]> = (route: ActivatedRouteSnapshot): Observable<CelebrityDto[]> => {
  const date: BornDate | null = readBornDate(route);

  return date ? inject(BornDayController).openDay(date, readBornFilters(route.queryParamMap)) : of([]);
};
