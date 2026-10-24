import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  Signal,
  TemplateRef,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import {
  MatFormField,
  MatPrefix,
  MatSuffix,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import {
  AppLayoutController,
  AppLayoutState,
} from '@birthday/web-layout-data-access';
import {
  APP_LAYOUT_CONFIG,
  AppLayoutConfig,
  AppLayoutSearch,
} from '@birthday/web-layout-util';
import { ReadonlyState, injectState } from '@birthday/web-shared-data-access';

@Component({
  selector: 'ui-app-layout-top-bar',
  imports: [
    NgOptimizedImage,
    NgTemplateOutlet,
    RouterLink,
    MatIconButton,
    MatFormField,
    MatPrefix,
    MatSuffix,
    MatIcon,
    MatInput,
  ],
  templateUrl: './app-layout-top-bar.component.html',
  styleUrl: './app-layout-top-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.search-expanded]': 'isSearchExpanded()',
  },
})
export class AppLayoutTopBarComponent {
  protected readonly config: AppLayoutConfig = inject(APP_LAYOUT_CONFIG);
  // On mobile the search collapses into an icon button; it collapses again when the route's search config changes.
  protected readonly isSearchExpanded: WritableSignal<boolean>;

  private readonly appLayoutState: ReadonlyState<AppLayoutState> =
    injectState(AppLayoutState);
  private readonly appLayoutController: AppLayoutController =
    inject(AppLayoutController);
  private readonly injector: Injector = inject(Injector);
  private readonly searchInput: Signal<
    ElementRef<HTMLInputElement> | undefined
  > = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly searchToggle: Signal<
    ElementRef<HTMLButtonElement> | undefined
  > = viewChild('searchToggle', { read: ElementRef });

  constructor() {
    this.isSearchExpanded = linkedSignal({
      source: this.appLayoutState.search,
      computation: () => false,
    });
  }

  protected get pageTitle(): Signal<string> {
    return this.appLayoutState.pageTitle;
  }

  protected get search(): Signal<AppLayoutSearch | null> {
    return this.appLayoutState.search;
  }

  protected get searchQuery(): Signal<string> {
    return this.appLayoutState.searchQuery;
  }

  protected get actions(): Signal<TemplateRef<unknown> | null> {
    return this.appLayoutState.actions;
  }

  protected setSearchQuery(event: Event): void {
    this.appLayoutController.setSearchQuery(
      (event.target as HTMLInputElement).value,
    );
  }

  protected expandSearch(): void {
    this.isSearchExpanded.set(true);
    afterNextRender(() => this.searchInput()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  protected collapseSearch(): void {
    // On desktop the field stays visible, so focus must only move when the field is hidden.
    const wasExpanded: boolean = this.isSearchExpanded();

    this.isSearchExpanded.set(false);
    this.appLayoutController.setSearchQuery('');

    if (wasExpanded) {
      afterNextRender(() => this.searchToggle()?.nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }
}
