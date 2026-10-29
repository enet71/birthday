import { ChangeDetectionStrategy, Component, computed, input, InputSignal, Signal } from '@angular/core';
import { getBirthdayTone } from '../../helpers';
import { BirthdayTone } from '../../types';

@Component({
  selector: 'ui-birthday-chip',
  templateUrl: './birthday-chip.component.html',
  styleUrl: './birthday-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--birthday-chip-tone]': "'var(--app-tone-' + tone() + '-ink)'",
    '[style.--birthday-chip-tone-container]': "'var(--app-tone-' + tone() + ')'",
  },
})
export class BirthdayChipComponent {
  public readonly name: InputSignal<string> = input.required();
  public readonly age: InputSignal<number | undefined> = input<number>();

  protected readonly tone: Signal<BirthdayTone> = computed(() => getBirthdayTone(this.name()));
  // A birthday shown in a year before the birth year has no meaningful age.
  protected readonly visibleAge: Signal<number | null> = computed(() => {
    const age: number | undefined = this.age();

    return age !== undefined && age > 0 ? age : null;
  });
}
