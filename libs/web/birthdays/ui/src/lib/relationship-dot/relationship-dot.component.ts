import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { BirthdayRelationship } from '@birthday/shared-models';

@Component({
  selector: 'ui-relationship-dot',
  templateUrl: './relationship-dot.component.html',
  styleUrl: './relationship-dot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class]': "'relationship-dot_' + relationship()",
  },
})
export class RelationshipDotComponent {
  public readonly relationship: InputSignal<BirthdayRelationship> = input.required();
}
