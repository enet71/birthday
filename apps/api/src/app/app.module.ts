import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@birthday/api-auth';
import { DatabaseModule } from '@birthday/api-database';
import { LoggerModule } from 'nestjs-pino';
import { Env, validateEnv } from './config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Local development only; in Docker the variables come from the environment and the file does not exist.
      envFilePath: 'apps/api/.env',
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          transport: config.get('NODE_ENV', { infer: true }) === 'development' ? { target: 'pino-pretty' } : undefined,
          // Docker probes the health check every 30 seconds.
          autoLogging: { ignore: (req) => req.url === '/api/health' },
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),
    DatabaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({ connectionString: config.get('DATABASE_URL', { infer: true }) }),
    }),
    AuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({ supabaseUrl: config.get('SUPABASE_URL', { infer: true }) }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
