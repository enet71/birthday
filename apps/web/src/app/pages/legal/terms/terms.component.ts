import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  imports: [RouterLink],
  templateUrl: './terms.component.html',
  styleUrl: '../legal-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The text is English in every language of the site.
  host: { lang: 'en' },
})
export class TermsComponent {}
