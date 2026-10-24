import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';

@Component({
  selector: 'ui-expandable-text',
  templateUrl: './expandable-text.component.html',
  styleUrl: './expandable-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpandableTextComponent {
  public readonly text: InputSignal<string> = input.required();
  public readonly textExpanded: OutputEmitterRef<boolean> = output();

  protected readonly isExpanded: WritableSignal<boolean> = signal(false);
  protected readonly showToggle: WritableSignal<boolean> = signal(false);

  private readonly textMeasure: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild('textMeasure');
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  constructor() {
    this.addResizeObserver();

    afterRenderEffect(() => {
      this.text();
      this.updateToggleVisibility();
    });
  }

  protected toggle(): void {
    this.isExpanded.update((isExpanded: boolean) => !isExpanded);
    this.textExpanded.emit(this.isExpanded());
  }

  private updateToggleVisibility(): void {
    const textMeasure: HTMLElement | undefined =
      this.textMeasure()?.nativeElement;

    if (!textMeasure) {
      return;
    }

    const showToggle: boolean =
      textMeasure.scrollWidth > textMeasure.clientWidth;
    this.showToggle.set(showToggle);

    if (!showToggle) {
      this.isExpanded.set(false);
    }
  }

  private addResizeObserver(): void {
    const resizeObserver: ResizeObserver = new ResizeObserver(() =>
      this.updateToggleVisibility(),
    );
    resizeObserver.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => resizeObserver.disconnect());
  }
}
