import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { GUIDES } from '../guides/guides.constants';
import { getGuidePath } from '../guides/guides.helpers';
import { Guide } from '../guides/guides.interfaces';
import { ABOUT_FAQ, ABOUT_FEATURES } from './about.constants';
import { AboutFaqItem, AboutFeature } from './about.interfaces';

@Component({
  selector: 'app-about',
  imports: [MatButton, MatExpansionModule, MatIcon, RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  protected readonly features: AboutFeature[] = ABOUT_FEATURES;
  protected readonly faq: AboutFaqItem[] = ABOUT_FAQ;
  protected readonly guides: Guide[] = GUIDES;
  protected readonly getGuidePath = getGuidePath;
}
