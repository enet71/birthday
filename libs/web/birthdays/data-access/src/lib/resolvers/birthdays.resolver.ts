import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { BirthdaysController } from '../state';

export const birthdaysResolver: ResolveFn<void> = () =>
  inject(BirthdaysController).loadBirthdays();
