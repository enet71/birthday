import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigurableModuleClass } from './auth.module-definition';
import { AuthController, MeController } from './controllers';
import { AdminGuard, AuthGuard, OriginGuard } from './guards';
import { AuthUsersService, GoogleSignInService, SessionsService, SignInNonceSealer } from './services';

@Module({
  controllers: [AuthController, MeController],
  providers: [
    GoogleSignInService,
    SignInNonceSealer,
    SessionsService,
    AuthUsersService,
    // Global guards run in this order: a forged request is rejected before its session is even looked up, and the admin
    // check needs the signed-in user.
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: AdminGuard },
  ],
})
export class AuthModule extends ConfigurableModuleClass {}
