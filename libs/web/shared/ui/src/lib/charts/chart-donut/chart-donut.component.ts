import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
  viewChild,
} from '@angular/core';
import { ChartDonutConfigs, ChartDonutRange } from './chart-donut.models';
import { findRange } from '@birthday/web-shared-util';

@Component({
  selector: 'ui-chart-donut',
  imports: [],
  templateUrl: './chart-donut.component.html',
  styleUrls: ['./chart-donut.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartDonutComponent<T> {
  public percent: InputSignal<number> = input(0, {
    transform: (value: number) => Math.min(value, 100),
  });
  public configs: InputSignal<ChartDonutConfigs<T>> = input.required();
  public selectedRange: OutputEmitterRef<ChartDonutRange<T>> = output();

  protected readonly strokeWidth: number = 10;
  protected readonly radius: number = 45;
  protected readonly circumference: number = 2 * Math.PI * this.radius;
  protected readonly dashoffset: number = this.circumference / 4;
  protected readonly dasharray: Signal<string> = computed(() =>
    this.computeDasharray(),
  );
  protected readonly range: Signal<ChartDonutRange<T>> = computed(() =>
    this.computeRange(),
  );

  private readonly donutFill: Signal<ElementRef<SVGCircleElement> | undefined> =
    viewChild('donutFillElement');
  private lastDasharray: string | null = null;

  constructor() {
    effect(() => {
      this.selectedRange.emit(this.range());
    });

    effect(() => {
      const element: SVGCircleElement | undefined =
        this.donutFill()?.nativeElement;
      if (!element) {
        return;
      }

      const fromDasharray: string =
        this.lastDasharray ?? `0, ${this.circumference}`;
      const currentDasharray: string = this.dasharray();

      if (fromDasharray !== currentDasharray) {
        element.animate(
          [
            { strokeDasharray: fromDasharray },
            { strokeDasharray: currentDasharray },
          ],
          {
            duration: 1000,
            easing: 'ease-out',
            fill: 'forwards',
          },
        );
      }

      this.lastDasharray = currentDasharray;
    });
  }

  private computeDasharray(): string {
    const dashLength: number = (this.circumference * this.percent()) / 100;
    return `${dashLength} ${this.circumference - dashLength}`;
  }

  private computeRange(): ChartDonutRange<T> {
    const ranges: ChartDonutRange<T>[] = this.configs().ranges;
    return findRange(this.percent(), ranges);
  }
}
