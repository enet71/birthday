import { inject, Injectable } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { BirthdaysController } from '@birthday/web-birthdays-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { RelationshipFilter } from '../types';
import { PeopleState } from './people.state';

@Injectable()
export class PeopleController extends StateController {
  private readonly peopleState: PeopleState = inject(PeopleState);
  private readonly birthdaysController: BirthdaysController = inject(BirthdaysController);

  // The route injector is created on every visit, so only the shared birthdays list needs a refresh, which also
  // retries a failed load.
  constructor() {
    super();
    this.birthdaysController.reloadBirthdays();
  }

  public searchPeople(query: string): void {
    this.peopleState.searchQuery.set(query);
  }

  public filterPeopleByRelationship(relationship: RelationshipFilter): void {
    this.peopleState.relationshipFilter.set(relationship);
  }

  public sortPeople(sort: Sort): void {
    this.peopleState.sort.set(sort);
  }
}
