import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants';

// Every endpoint requires a signed-in user unless it is marked public.
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
