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
import { BirthdayAvatarComponent } from '../birthday-avatar';

@Component({
  selector: 'ui-birthday-chip',
  imports: [BirthdayAvatarComponent],
  templateUrl: './birthday-chip.component.html',
  styleUrl: './birthday-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--birthday-chip-tone]': "'var(--mat-sys-' + tone() + '-container)'",
    '[style.--birthday-chip-on-tone]':
      "'var(--mat-sys-on-' + tone() + '-container)'",
  },
})
export class BirthdayChipComponent {
  public readonly name: InputSignal<string> = input.required();

  protected readonly tone: Signal<BirthdayTone> = computed(() =>
    getBirthdayTone(this.name()),
  );
}
