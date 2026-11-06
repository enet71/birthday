import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-people',
  templateUrl: './people.component.html',
  styleUrl: './people.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeopleComponent {}
