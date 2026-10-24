import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[uiStopPropagation]',
  standalone: true,
})
export class StopPropagationDirective {
  @HostListener('click', ['$event']) public onClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
