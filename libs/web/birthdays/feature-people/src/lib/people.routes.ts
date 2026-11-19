import { inject, provideEnvironmentInitializer } from '@angular/core';
import { Route } from '@angular/router';
import { PeoplePageComponent, PersonPageComponent } from './components';
import { PEOPLE_PERSON_ID_PARAM } from './constants';
import { PeopleController, PeopleState, PersonController, PersonState } from './state';

export const PEOPLE_ROUTES: Route[] = [
  {
    path: '',
    component: PeoplePageComponent,
    providers: [PeopleState, PeopleController],
  },
  {
    path: `:${PEOPLE_PERSON_ID_PARAM}`,
    title: 'routes.person.title',
    component: PersonPageComponent,
    providers: [
      PersonState,
      PersonController,
      // The page has no commands, so nothing else creates the controller that refreshes the birthdays list and shows the
      // header loader on entry.
      provideEnvironmentInitializer(() => inject(PersonController)),
    ],
  },
];
