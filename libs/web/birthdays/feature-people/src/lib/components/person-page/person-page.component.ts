import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { BirthdayAvatarComponent, RelationshipDotComponent } from '@birthday/web-birthdays-ui';
import { injectState, ReadonlyState } from '@birthday/web-shared-data-access';
import { AppTranslateService, LocaleDatePipe } from '@birthday/web-shared-i18n';
import { PersonState } from '../../state';
import { PersonRow } from '../../types';

@Component({
  selector: 'ui-person-page',
  imports: [TranslocoPipe, LocaleDatePipe, MatButton, MatIcon, RouterLink, BirthdayAvatarComponent, RelationshipDotComponent],
  templateUrl: './person-page.component.html',
  styleUrl: './person-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonPageComponent {
  private readonly personState: ReadonlyState<PersonState> = injectState(PersonState);
  private readonly translator: AppTranslateService = inject(AppTranslateService);

  protected get person(): Signal<PersonRow | null> {
    return this.personState.person;
  }

  protected get isLoading(): Signal<boolean> {
    return this.personState.isLoading;
  }

  protected getDaysUntilLabel(daysUntil: number): string {
    if (daysUntil === 0) {
      return this.translator.translate('calendar.today');
    }

    return daysUntil === 1 ? this.translator.translate('calendar.tomorrow') : this.translator.translatePlural('calendar.inDays', daysUntil);
  }

  protected getAgeLabel(age: number): string {
    return this.translator.translatePlural('person.years', age);
  }
}
