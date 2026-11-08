import { Route } from '@angular/router';
import { PeoplePageComponent } from './components';
import { openPeoplePageResolver } from './people.resolvers';
import { PeopleController, PeopleState } from './state';

export const PEOPLE_ROUTES: Route[] = [
  {
    path: '',
    component: PeoplePageComponent,
    providers: [PeopleState, PeopleController],
    resolve: { people: openPeoplePageResolver },
  },
];
