import { computed, inject, Injectable, linkedSignal, signal, Signal, WritableSignal } from '@angular/core';
import { disabled, FieldTree, form } from '@angular/forms/signals';
import { PushSupport, ReminderSettings, RemindersState } from '@birthday/web-reminders-data-access';
import { injectState, ReadonlyState, State } from '@birthday/web-shared-data-access';
import { PlatformService } from '@birthday/web-shared-util';
import { ReminderSectionView, ReminderSettingsModel } from '../types';

@Injectable()
export class ReminderSectionState extends State {
  private readonly remindersState: ReadonlyState<RemindersState> = injectState(RemindersState);
  private readonly platform: PlatformService = inject(PlatformService);

  public readonly isPending: WritableSignal<boolean> = signal(false);
  // The session and the browser APIs are known only in the browser, so the server and the first client render show
  // the loading view.
  public readonly view: Signal<ReminderSectionView> = computed(() => {
    // A reload on entering Settings keeps the current view.
    if (!this.platform.isRendered() || this.remindersState.isFirstLoad()) {
      return 'loading';
    }
    if (this.remindersState.hasLoadError()) {
      return 'error';
    }

    const support: PushSupport = this.remindersState.support();

    if (support !== 'supported') {
      return support;
    }
    if (this.remindersState.deviceSubscription()) {
      return 'enabled';
    }

    return this.remindersState.permission() === 'denied' ? 'blocked' : 'disabled';
  });
  // The account's settings apply to every device, so they show even where this device cannot get notifications.
  public readonly settings: Signal<ReminderSettings | null> = computed(() =>
    ['loading', 'error'].includes(this.view()) ? null : this.remindersState.settings(),
  );
  // What the controls show. It follows the saved settings; the Controller sets it back to them after a save.
  public readonly settingsModel: WritableSignal<ReminderSettingsModel> = linkedSignal(() => this.toModel(this.settings()));
  public readonly settingsForm: FieldTree<ReminderSettingsModel> = form(this.settingsModel, (path) => {
    disabled(path, () => this.isPending());
  });

  public override resetState(): void {
    this.isPending.set(false);
  }

  public resetSettingsModel(): void {
    this.settingsModel.set(this.toModel(this.settings()));
  }

  // The controls show only with settings, so the defaults are never visible.
  private toModel(settings: ReminderSettings | null): ReminderSettingsModel {
    return { days: settings?.days ?? 'both', hour: settings?.hour ?? 9 };
  }
}
