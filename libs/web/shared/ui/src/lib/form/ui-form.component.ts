import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-form',
  imports: [],
  templateUrl: './ui-form.component.html',
  styleUrl: './ui-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiFormComponent {}
