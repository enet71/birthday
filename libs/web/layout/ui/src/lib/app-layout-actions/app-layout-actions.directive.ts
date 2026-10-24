import { DestroyRef, Directive, inject, TemplateRef } from '@angular/core';
import { AppLayoutController } from '@birthday/web-layout-data-access';

@Directive({
  selector: 'ng-template[uiAppLayoutActions]',
})
export class AppLayoutActionsDirective {
  private readonly appLayoutController: AppLayoutController =
    inject(AppLayoutController);
  private readonly templateRef: TemplateRef<unknown> = inject(TemplateRef);

  constructor() {
    this.appLayoutController.setActions(this.templateRef);
    inject(DestroyRef).onDestroy(() =>
      this.appLayoutController.clearActions(this.templateRef),
    );
  }
}
