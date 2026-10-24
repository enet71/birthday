import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  InputSignal,
  Signal,
} from '@angular/core';
import { getBirthdayTone } from '../../helpers';
import { BirthdayTone } from '../../types';

@Component({
  selector: 'ui-birthday-avatar',
  templateUrl: './birthday-avatar.component.html',
  styleUrl: './birthday-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.--birthday-tone]': "'var(--mat-sys-' + tone() + '-container)'",
    '[style.--birthday-on-tone]': "'var(--mat-sys-on-' + tone() + '-container)'",
  },
})
export class BirthdayAvatarComponent {
  public readonly name: InputSignal<string> = input.required();

  protected readonly initial: Signal<string> = computed(() =>
    this.name().trim().charAt(0).toUpperCase(),
  );
  protected readonly tone: Signal<BirthdayTone> = computed(() =>
    getBirthdayTone(this.name()),
  );
}
