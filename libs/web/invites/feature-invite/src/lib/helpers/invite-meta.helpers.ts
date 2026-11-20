import { ActivatedRouteSnapshot } from '@angular/router';
import { AppRouteTranslator } from '@birthday/web-shared-util';
import { INVITE_DATA_KEY } from '../constants';
import { InviteLoadResult } from '../types';

// Chats show these in the link preview, so they name the person who sent the link. A load that failed says nothing
// about the link, so its texts stay neutral.
export function buildInviteDocumentTitle(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  const result: InviteLoadResult | undefined = readResult(route);

  switch (result?.status) {
    case 'ready':
      return translator.translate('invites.guest.documentTitle', { name: result.invite.displayName });
    case 'invalid':
      return translator.translate('invites.guest.invalidDocumentTitle');
    default:
      return translator.translate('invites.guest.failedDocumentTitle');
  }
}

export function buildInviteDescription(translator: AppRouteTranslator, route: ActivatedRouteSnapshot): string {
  const result: InviteLoadResult | undefined = readResult(route);

  switch (result?.status) {
    case 'ready':
      return translator.translate('invites.guest.description', { name: result.invite.displayName });
    case 'invalid':
      return translator.translate('invites.guest.invalidDescription');
    default:
      return translator.translate('invites.guest.loadFailedText');
  }
}

function readResult(route: ActivatedRouteSnapshot): InviteLoadResult | undefined {
  return route.data[INVITE_DATA_KEY];
}
