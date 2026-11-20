import { ChangeDetectionStrategy, Component, inject, RESPONSE_INIT } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-not-found',
  imports: [TranslocoPipe, MatButton, MatIcon, RouterLink],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  constructor() {
    // Also a 404 under server routes that answer 200, such as an unknown date under `born/**`.
    const responseInit: ResponseInit | null = inject(RESPONSE_INIT, { optional: true });

    if (responseInit) {
      responseInit.status = 404;
    }
  }
}
