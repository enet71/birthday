import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { CalendarController, CalendarState } from '../../state';

@Component({
  selector: 'ui-sign-in-prompt',
  imports: [MatButton, MatIcon],
  templateUrl: './sign-in-prompt.component.html',
  styleUrl: './sign-in-prompt.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPromptComponent {
  private readonly calendarState: ReadonlyState<CalendarState> = injectState(CalendarState);
  private readonly calendarController: CalendarController = inject(CalendarController);

  protected get isSigningIn(): Signal<boolean> {
    return this.calendarState.isSigningIn;
  }

  protected signInWithGoogle(): void {
    this.calendarController.signInWithGoogle();
  }
}
