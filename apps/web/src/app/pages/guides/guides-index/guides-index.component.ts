import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { GUIDES } from '../guides.constants';
import { getGuidePath } from '../guides.helpers';
import { Guide } from '../guides.interfaces';

@Component({
  selector: 'app-guides-index',
  imports: [MatIcon, RouterLink],
  templateUrl: './guides-index.component.html',
  styleUrl: './guides-index.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidesIndexComponent {
  protected readonly guides: Guide[] = GUIDES;
  protected readonly getGuidePath = getGuidePath;
}
