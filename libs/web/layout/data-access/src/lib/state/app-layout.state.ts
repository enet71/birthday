import { Injectable, signal, TemplateRef, WritableSignal } from '@angular/core';
import { AppLayoutSearch } from '@birthday/web-layout-util';
import { State } from '@birthday/web-shared-data-access';

@Injectable({ providedIn: 'root' })
export class AppLayoutState extends State {
  public readonly isSidenavExpanded: WritableSignal<boolean> = signal(true);
  public readonly pageTitle: WritableSignal<string> = signal('');
  public readonly search: WritableSignal<AppLayoutSearch | null> = signal(null);
  public readonly searchQuery: WritableSignal<string> = signal('');
  public readonly actions: WritableSignal<TemplateRef<unknown> | null> =
    signal(null);

  public override resetState(): void {
    this.isSidenavExpanded.set(true);
    this.pageTitle.set('');
    this.search.set(null);
    this.searchQuery.set('');
    this.actions.set(null);
  }
}
