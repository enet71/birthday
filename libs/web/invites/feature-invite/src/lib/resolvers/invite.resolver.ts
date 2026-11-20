import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Observable } from 'rxjs';
import { INVITE_TOKEN_PARAM } from '../constants';
import { InviteController } from '../state';
import { InviteLoadResult } from '../types';

// Loads the invite before the page activates, so the server-rendered title and link preview name the owner.
export const inviteResolver: ResolveFn<InviteLoadResult> = (route: ActivatedRouteSnapshot): Observable<InviteLoadResult> =>
  inject(InviteController).openInvite(route.paramMap.get(INVITE_TOKEN_PARAM) ?? '');
