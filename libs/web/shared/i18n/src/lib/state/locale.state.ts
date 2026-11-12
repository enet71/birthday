import { Injectable, signal, WritableSignal } from '@angular/core';
import { State } from '@birthday/web-shared-data-access';
import { APP_DEFAULT_LOCALE } from '../constants';
import { AppLocale } from '../types';

@Injectable({ providedIn: 'root' })
export class LocaleState extends State {
  // Changes only after the language's texts and date data have loaded.
  public readonly locale: WritableSignal<AppLocale> = signal(APP_DEFAULT_LOCALE);
}
