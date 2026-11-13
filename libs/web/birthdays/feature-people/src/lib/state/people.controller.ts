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

  // Every visit starts with a fresh list, no search or filter, and the default sort.
  public openPeoplePage(): void {
    this.peopleState.resetState();
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
