import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types';

// The user that `AuthGuard` resolved from the access token. A `@Public()` endpoint has no user, so using the decorator
// there is a programming error.
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;

  if (!user) {
    throw new Error('@CurrentUser() is used on an endpoint without a signed-in user, such as a @Public() one');
  }

  return user;
});
