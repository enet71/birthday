import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'ui-settings-section',
  imports: [MatCard, MatIcon],
  templateUrl: './settings-section.component.html',
  styleUrl: './settings-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSectionComponent {
  readonly heading: InputSignal<string> = input.required<string>();
  readonly icon: InputSignal<string> = input.required<string>();
}
