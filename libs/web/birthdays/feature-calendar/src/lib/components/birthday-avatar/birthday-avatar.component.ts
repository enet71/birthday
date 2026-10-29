import { ChangeDetectionStrategy, Component, computed, input, InputSignal, Signal } from '@angular/core';
import { getBirthdayTone } from '../../helpers';
import { BirthdayTone } from '../../types';

@Component({
  selector: 'ui-birthday-avatar',
  templateUrl: './birthday-avatar.component.html',
  styleUrl: './birthday-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.--birthday-tone]': "'var(--app-tone-' + tone() + '-ink)'",
    '[style.--birthday-tone-container]': "'var(--app-tone-' + tone() + ')'",
  },
})
export class BirthdayAvatarComponent {
  public readonly name: InputSignal<string> = input.required();

  protected readonly initials: Signal<string> = computed(() =>
    this.name()
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word: string) => word.charAt(0).toUpperCase())
      .join(''),
  );
  protected readonly tone: Signal<BirthdayTone> = computed(() => getBirthdayTone(this.name()));
}
