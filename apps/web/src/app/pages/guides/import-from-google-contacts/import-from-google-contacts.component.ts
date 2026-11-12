import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BIRTHDAY_REMINDERS_GUIDE, IMPORT_FROM_GOOGLE_CONTACTS_GUIDE } from '../guides.constants';
import { getGuidePath } from '../guides.helpers';
import { Guide } from '../guides.interfaces';
import { RelatedGuidesComponent } from '../related-guides/related-guides.component';
import { LocaleDatePipe } from '@birthday/web-shared-i18n';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-import-from-google-contacts',
  imports: [TranslocoPipe, LocaleDatePipe, RouterLink, RelatedGuidesComponent],
  templateUrl: './import-from-google-contacts.component.html',
  styleUrl: '../guide-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportFromGoogleContactsComponent {
  protected readonly guide: Guide = IMPORT_FROM_GOOGLE_CONTACTS_GUIDE;
  protected readonly remindersGuidePath: string = getGuidePath(BIRTHDAY_REMINDERS_GUIDE);
}
