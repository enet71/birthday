import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthModuleOptions } from '../types';
import { OriginGuard } from './origin.guard';

const APP_ORIGIN = 'https://birthdly.example';

function createContext(method: string, origin?: string): ExecutionContext {
  const request = { method, headers: origin === undefined ? {} : { origin } };

  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('OriginGuard', () => {
  const guard = new OriginGuard({ appOrigin: APP_ORIGIN } as AuthModuleOptions);

  it.each(['GET', 'HEAD', 'OPTIONS'])('lets a %s request without Origin through', (method: string) => {
    expect(guard.canActivate(createContext(method))).toBe(true);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('lets a %s request from the app origin through', (method: string) => {
    expect(guard.canActivate(createContext(method, APP_ORIGIN))).toBe(true);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('rejects a %s request without Origin', (method: string) => {
    expect(() => guard.canActivate(createContext(method))).toThrow(ForbiddenException);
  });

  it.each(['https://evil.example', `${APP_ORIGIN}.evil.example`, 'null', 'http://birthdly.example'])(
    'rejects a POST request from the origin %s',
    (origin: string) => {
      expect(() => guard.canActivate(createContext('POST', origin))).toThrow(ForbiddenException);
    },
  );
});
