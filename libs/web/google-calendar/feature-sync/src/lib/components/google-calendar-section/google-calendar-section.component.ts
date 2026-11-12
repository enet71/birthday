import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { GoogleCalendarSectionController, GoogleCalendarSectionState } from '../../state';
import { GoogleCalendarSectionView } from '../../types';
import { LocaleDatePipe } from '@birthday/web-shared-i18n';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ui-google-calendar-section',
  imports: [TranslocoPipe, LocaleDatePipe, MatButton, MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatIcon, MatProgressSpinner],
  providers: [GoogleCalendarSectionState, GoogleCalendarSectionController],
  templateUrl: './google-calendar-section.component.html',
  styleUrl: './google-calendar-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCalendarSectionComponent {
  private readonly sectionState: ReadonlyState<GoogleCalendarSectionState> = injectState(GoogleCalendarSectionState);
  private readonly sectionController: GoogleCalendarSectionController = inject(GoogleCalendarSectionController);

  protected get view(): Signal<GoogleCalendarSectionView> {
    return this.sectionState.view;
  }

  protected get lastSyncedAt(): Signal<string | null> {
    return this.sectionState.lastSyncedAt;
  }

  protected get isPending(): Signal<boolean> {
    return this.sectionState.isPending;
  }

  protected connect(): void {
    this.sectionController.connect();
  }

  protected syncNow(): void {
    this.sectionController.syncNow();
  }

  protected disconnect(): void {
    this.sectionController.disconnect();
  }

  protected reloadConnection(): void {
    this.sectionController.reloadConnection();
  }
}
