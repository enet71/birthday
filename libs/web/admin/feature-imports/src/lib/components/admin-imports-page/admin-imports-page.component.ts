import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CelebrityImportsStatusResponse } from '@birthday/shared-models';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { ADMIN_DATE_FORMAT, ADMIN_IMPORT_STATUS_LABELS, ADMIN_JOB_STATE_COLUMNS } from '../../constants';
import { AdminImportsController, AdminImportsState } from '../../state';
import { AdminImportStage } from '../../types';

@Component({
  selector: 'ui-admin-imports-page',
  imports: [DatePipe, MatButton, MatIcon, MatProgressBar, MatProgressSpinner],
  templateUrl: './admin-imports-page.component.html',
  styleUrl: './admin-imports-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminImportsPageComponent {
  private readonly adminImportsState: ReadonlyState<AdminImportsState> = injectState(AdminImportsState);
  private readonly adminImportsController: AdminImportsController = inject(AdminImportsController);

  protected readonly statusLabels = ADMIN_IMPORT_STATUS_LABELS;
  protected readonly jobStateColumns = ADMIN_JOB_STATE_COLUMNS;
  protected readonly dateFormat = ADMIN_DATE_FORMAT;

  protected get status(): Signal<CelebrityImportsStatusResponse | null> {
    return this.adminImportsState.status;
  }

  protected get stages(): Signal<AdminImportStage[]> {
    return this.adminImportsState.stages;
  }

  protected get isImportRunning(): Signal<boolean> {
    return this.adminImportsState.isImportRunning;
  }

  protected get isLoading(): Signal<boolean> {
    return this.adminImportsState.isLoading;
  }

  protected get isRefreshing(): Signal<boolean> {
    return this.adminImportsState.isRefreshing;
  }

  protected get isNotFound(): Signal<boolean> {
    return this.adminImportsState.isNotFound;
  }

  protected get hasLoadError(): Signal<boolean> {
    return this.adminImportsState.hasLoadError;
  }

  protected refresh(): void {
    this.adminImportsController.refresh();
  }
}
