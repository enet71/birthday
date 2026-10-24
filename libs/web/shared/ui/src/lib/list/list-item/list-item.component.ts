import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-list-item',
  imports: [],
  templateUrl: './list-item.component.html',
  styleUrl: './list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListItemComponent {}
