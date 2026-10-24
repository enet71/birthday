import { Directive, HostListener, inject } from '@angular/core';
import { Location } from '@angular/common';

@Directive({
  selector: '[uiNavigateBack]',
  standalone: true,
})
export class NavigateBackDirective {
  private location: Location = inject(Location);

  @HostListener('click') public onClick(): void {
    this.location.back();
  }
}
