import { ChangeDetectionStrategy, Component, computed, input, InputSignal, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GUIDES } from '../guides.constants';
import { getGuidePath } from '../guides.helpers';
import { Guide } from '../guides.interfaces';

@Component({
  selector: 'app-related-guides',
  imports: [RouterLink],
  templateUrl: './related-guides.component.html',
  styleUrl: './related-guides.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatedGuidesComponent {
  public readonly current: InputSignal<Guide> = input.required<Guide>();

  protected readonly guides: Signal<Guide[]> = computed(() => GUIDES.filter((guide: Guide) => guide !== this.current()));
  protected readonly getGuidePath = getGuidePath;
}
