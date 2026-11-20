import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_ADMIN_ONLY_KEY } from '../constants';

export function isAdminOnly(reflector: Reflector, context: ExecutionContext): boolean {
  return reflector.getAllAndOverride<boolean | undefined>(IS_ADMIN_ONLY_KEY, [context.getHandler(), context.getClass()]) === true;
}
