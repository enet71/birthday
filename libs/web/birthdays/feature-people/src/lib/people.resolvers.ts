import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { PeopleController } from './state';

// Route providers outlive the page, so page entry is handled here: it runs on every visit, which also retries a
// failed load.
export const openPeoplePageResolver: ResolveFn<void> = (): void => inject(PeopleController).openPeoplePage();
