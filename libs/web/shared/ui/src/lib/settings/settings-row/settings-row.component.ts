import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { SettingsRowTone } from './settings-row.models';

@Component({
  selector: 'ui-settings-row',
  imports: [MatIcon],
  templateUrl: './settings-row.component.html',
  styleUrl: './settings-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-tone]': 'tone()',
    '[attr.data-has-icon]': 'icon() ? "" : null',
  },
})
export class SettingsRowComponent {
  readonly icon: InputSignal<string | undefined> = input<string>();
  readonly label: InputSignal<string | undefined> = input<string>();
  readonly description: InputSignal<string | undefined> = input<string>();
  readonly tone: InputSignal<SettingsRowTone> = input<SettingsRowTone>('neutral');
}
