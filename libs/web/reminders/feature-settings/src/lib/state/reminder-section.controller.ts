import { afterNextRender, inject, Injectable, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { AuthController } from '@birthday/web-auth-data-access';
import { ReminderDays, RemindersController } from '@birthday/web-reminders-data-access';
import { StateController } from '@birthday/web-shared-data-access';
import { ReminderSettingsModel } from '../types';
import { ReminderSectionState } from './reminder-section.state';

@Injectable()
export class ReminderSectionController extends StateController {
  private readonly sectionState: ReminderSectionState = inject(ReminderSectionState);
  private readonly remindersController: RemindersController = inject(RemindersController);
  private readonly authController: AuthController = inject(AuthController);
  private readonly injector: Injector = inject(Injector);

  constructor() {
    super();
    this.remindersController.reload();
  }

  public signInWithGoogle(): void {
    this.runPending(this.authController.signInWithGoogle());
  }

  public enable(): void {
    this.runPending(this.remindersController.enableOnDevice());
  }

  public disable(): void {
    this.runPending(this.remindersController.disableOnDevice());
  }

  public setDays(days: ReminderDays): void {
    this.saveSettings({ days });
  }

  public setHour(hour: number): void {
    this.saveSettings({ hour });
  }

  public reload(): void {
    this.remindersController.reload();
  }

  // Shows the saved settings again when the request ends, which undoes the pick after a failure. It waits for a render,
  // because the form passes a value to the control only on render: a request that fails at once would otherwise set the
  // model back before the control's pick reached it, and the control would keep the pick.
  private saveSettings(changes: Partial<ReminderSettingsModel>): void {
    this.runPending(
      this.remindersController
        .saveSettings(changes)
        .pipe(finalize(() => afterNextRender(() => this.sectionState.resetSettingsModel(), { injector: this.injector }))),
    );
  }

  private runPending(request: Observable<void>): void {
    this.sectionState.isPending.set(true);
    request
      .pipe(
        finalize(() => this.sectionState.isPending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
