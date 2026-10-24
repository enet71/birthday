import {
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

@Directive({
  selector: '[uiIntersection]',
  standalone: true,
})
export class IntersectionDirective implements OnInit, OnDestroy {
  @Input() public uiIntersectionOptions!: IntersectionObserverInit;
  @Output() public readonly uiIntersectionChanged: EventEmitter<
    IntersectionObserverEntry[]
  > = new EventEmitter();

  private intersectionObserver!: IntersectionObserver;
  private readonly element: ElementRef = inject(ElementRef);

  public ngOnInit(): void {
    this.createIntersectionObserver();
  }

  public ngOnDestroy(): void {
    this.intersectionObserver.disconnect();
  }

  private createIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        this.uiIntersectionChanged.emit(entries);
      },
      this.uiIntersectionOptions,
    );
    this.intersectionObserver.observe(this.element.nativeElement);
  }
}
