import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BirthdayAvatarComponent } from '@birthday/web-birthdays-ui';
import { CelebrityCard } from '../../types';

@Component({
  selector: 'ui-celebrity-card',
  imports: [TranslocoPipe, BirthdayAvatarComponent],
  templateUrl: './celebrity-card.component.html',
  styleUrl: './celebrity-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CelebrityCardComponent {
  public readonly celebrity: InputSignal<CelebrityCard> = input.required();
}
