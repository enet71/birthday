import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-people',
  template: `
    <h1 class="title">People</h1>
    <p class="description">This page is coming soon.</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0 2rem 2rem;
    }

    .title {
      font-size: 1.375rem;
      font-weight: 700;
    }

    .description {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeopleComponent {}
