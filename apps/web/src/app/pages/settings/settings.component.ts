import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  template: `<p class="description">This page is coming soon.</p>`,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      padding-bottom: 2rem;
    }

    .description {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {}
