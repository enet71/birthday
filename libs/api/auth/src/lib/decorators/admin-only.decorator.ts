import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { IS_ADMIN_ONLY_KEY } from '../constants';

// Only for signed-in users listed in `ADMIN_EMAILS`; everyone else gets 404, so the endpoint does not reveal itself.
export const AdminOnly = (): CustomDecorator<string> => SetMetadata(IS_ADMIN_ONLY_KEY, true);
