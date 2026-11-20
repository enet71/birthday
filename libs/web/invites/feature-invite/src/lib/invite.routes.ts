import { Route } from '@angular/router';
import { APP_DESCRIPTION_DATA_KEY, APP_DOCUMENT_TITLE_DATA_KEY, APP_NOINDEX_DATA_KEY } from '@birthday/web-shared-util';
import { InvitePageComponent } from './components';
import { INVITE_DATA_KEY, INVITE_TOKEN_PARAM } from './constants';
import { buildInviteDescription, buildInviteDocumentTitle } from './helpers';
import { inviteResolver } from './resolvers';
import { InviteController, InviteState } from './state';

export const INVITE_ROUTES: Route[] = [
  {
    path: `:${INVITE_TOKEN_PARAM}`,
    component: InvitePageComponent,
    providers: [InviteState, InviteController],
    resolve: { [INVITE_DATA_KEY]: inviteResolver },
    title: 'routes.invite.title',
    // Links are private, so search engines must not index them.
    data: {
      [APP_NOINDEX_DATA_KEY]: true,
      [APP_DOCUMENT_TITLE_DATA_KEY]: buildInviteDocumentTitle,
      [APP_DESCRIPTION_DATA_KEY]: buildInviteDescription,
    },
  },
];
