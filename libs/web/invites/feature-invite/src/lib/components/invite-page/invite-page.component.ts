import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Signal,
  signal,
  untracked,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { FieldTree, form, FormField, maxLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { getDaysInMonth } from 'date-fns';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { LocaleDatePipe } from '@birthday/web-shared-i18n';
import { TranslocoPipe } from '@jsverse/transloco';
import { INVITE_ANY_LEAP_YEAR, INVITE_NAME_MAX_LENGTH } from '../../constants';
import { InviteController, InviteState } from '../../state';
import { InviteFormModel, InviteLoadResult, InviteSubmitError } from '../../types';

@Component({
  selector: 'ui-invite-page',
  imports: [
    TranslocoPipe,
    LocaleDatePipe,
    FormField,
    MatButton,
    MatError,
    MatFormField,
    MatHint,
    MatIcon,
    MatInput,
    MatLabel,
    MatOption,
    MatPrefix,
    MatSelect,
    RouterLink,
  ],
  templateUrl: './invite-page.component.html',
  styleUrl: './invite-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitePageComponent {
  private readonly inviteState: ReadonlyState<InviteState> = injectState(InviteState);
  private readonly inviteController: InviteController = inject(InviteController);

  protected readonly nameMaxLength: number = INVITE_NAME_MAX_LENGTH;
  protected readonly months: Date[] = Array.from({ length: 12 }, (_, index: number) => new Date(INVITE_ANY_LEAP_YEAR, index));
  protected readonly model: WritableSignal<InviteFormModel> = signal(createModel());
  protected readonly days: Signal<number[]> = computed(() =>
    Array.from({ length: getDaysInMonth(new Date(INVITE_ANY_LEAP_YEAR, this.model().month - 1)) }, (_, index: number) => index + 1),
  );
  // Error messages are translation keys; the template translates them. The rules match the Birthday dialog.
  protected readonly inviteForm: FieldTree<InviteFormModel> = form(this.model, (path) => {
    required(path.name, { message: 'invites.guest.errors.nameRequired' });
    pattern(path.name, /\S/, { message: 'invites.guest.errors.nameRequired' });
    maxLength(path.name, INVITE_NAME_MAX_LENGTH, { message: 'invites.guest.errors.nameTooLong' });
    pattern(path.year, /^([1-9]\d{3})?$/, { message: 'birthdayDialog.errors.yearFormat' });
    validate(path.year, ({ value }) =>
      Number(value()) > new Date().getFullYear() ? { kind: 'futureYear', message: 'birthdayDialog.errors.futureYear' } : undefined,
    );
    // Picking a shorter month keeps the chosen day, and Feb 29 exists only in leap years.
    validate(path.day, ({ value, valueOf }) => {
      const year: string = valueOf(path.year);
      const daysInMonth: number = getDaysInMonth(new Date(/^\d{4}$/.test(year) ? Number(year) : INVITE_ANY_LEAP_YEAR, valueOf(path.month) - 1));

      return value() > daysInMonth ? { kind: 'invalidDay', message: 'birthdayDialog.errors.invalidDay' } : undefined;
    });
  });

  // Every view has its own card title; a new one replaces the element that had focus.
  private readonly cardTitle: Signal<ElementRef<HTMLElement> | undefined> = viewChild<ElementRef<HTMLElement>>('cardTitle');
  private hasShownFirstView = false;

  constructor() {
    // Sending, sending again, or the link going dead swaps the card and removes the focused button, so focus moves to
    // the new card's title, which screen readers then read. The first view keeps the browser's own focus.
    effect(() => {
      const title: ElementRef<HTMLElement> | undefined = this.cardTitle();

      untracked(() => {
        if (title && this.hasShownFirstView) {
          title.nativeElement.focus();
        }
        this.hasShownFirstView ||= !!title;
      });
    });
  }

  protected get loadResult(): Signal<InviteLoadResult | null> {
    return this.inviteState.loadResult;
  }

  protected get displayName(): Signal<string | null> {
    return this.inviteState.displayName;
  }

  protected get isRetrying(): Signal<boolean> {
    return this.inviteState.isRetrying;
  }

  protected get isSending(): Signal<boolean> {
    return this.inviteState.isSending;
  }

  protected get isSent(): Signal<boolean> {
    return this.inviteState.isSent;
  }

  protected get submitError(): Signal<InviteSubmitError | null> {
    return this.inviteState.submitError;
  }

  protected get isAuthenticated(): Signal<boolean> {
    return this.inviteState.isAuthenticated;
  }

  protected send(event: Event): void {
    event.preventDefault();
    // `submit` requires a Promise-returning action; sending itself stays an Observable in the controller.
    submit(this.inviteForm, async () => this.inviteController.submit(this.model()));
  }

  protected sendAnother(): void {
    this.inviteForm().reset(createModel());
    this.inviteController.sendAnother();
  }

  protected retry(): void {
    this.inviteController.retry();
  }
}

function createModel(): InviteFormModel {
  return { name: '', month: 1, day: 1, year: '', website: '' };
}
