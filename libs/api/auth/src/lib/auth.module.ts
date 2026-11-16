import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JWTVerifyGetKey } from 'jose';
import { AuthGuard } from './auth.guard';
import { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } from './auth.module-definition';
import { JWT_KEY_SET } from './constants';
import { MeController } from './me.controller';
import { createSupabaseKeySet } from './supabase-key-set';
import { AuthModuleOptions } from './types';
import { getSupabaseJwksUrl } from './utils';

@Module({
  controllers: [MeController],
  providers: [
    {
      provide: JWT_KEY_SET,
      inject: [MODULE_OPTIONS_TOKEN],
      useFactory: (options: AuthModuleOptions): JWTVerifyGetKey => createSupabaseKeySet(getSupabaseJwksUrl(options.supabaseUrl)),
    },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule extends ConfigurableModuleClass {}
