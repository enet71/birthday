import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-dialog-header',
  imports: [],
  templateUrl: './dialog-header.component.html',
  styleUrl: './dialog-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogHeaderComponent {}
