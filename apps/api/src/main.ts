import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { Env } from './app/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  const port = app.get(ConfigService<Env, true>).get('PORT', { infer: true });

  app.useLogger(logger);
  // In production the reverse proxy on the private Docker network sets `X-Forwarded-For` to the visitor's address,
  // so `req.ip` is the visitor rather than the proxy.
  app.set('trust proxy', 'loopback, uniquelocal');
  app.setGlobalPrefix('api');
  // Closes the database pool when Docker stops the container.
  app.enableShutdownHooks();
  await app.listen(port);

  // Set when Nx waits for this server to be ready
  if (process.env['NX_READY_SIGNAL_SOCKET']) {
    try {
      // Function keeps TypeScript and bundlers from rewriting or bundling the import
      const load = new Function('s', 'return import(s)') as (s: string) => Promise<{ emitReadySignal(server: unknown): boolean }>;
      (await load('@nx/js/ready-signal')).emitReadySignal(app.getHttpServer());
    } catch {
      // @nx/js isn't installed
    }
  }

  logger.log(`The API is listening on http://localhost:${port}/api`);
}

bootstrap();
