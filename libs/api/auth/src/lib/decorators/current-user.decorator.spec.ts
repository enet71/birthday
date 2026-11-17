import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { AuthUser } from '../types';
import { CurrentUser } from './current-user.decorator';

type ParamFactory = (data: unknown, context: ExecutionContext) => unknown;

// Nest stores the factory of a custom param decorator in the route arguments metadata of the decorated method.
function getParamDecoratorFactory(decorator: () => ParameterDecorator): ParamFactory {
  class TestController {
    public handle(@decorator() user: AuthUser): AuthUser {
      return user;
    }
  }

  const args: Record<string, { factory: ParamFactory }> = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'handle');

  return Object.values(args)[0].factory;
}

function createContext(request: { user?: AuthUser }): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('CurrentUser', () => {
  const factory = getParamDecoratorFactory(CurrentUser);

  it('returns the user of the request', () => {
    const user: AuthUser = { id: 'user-1', email: 'user@example.com', name: null };

    expect(factory(undefined, createContext({ user }))).toBe(user);
  });

  it('throws when the request has no user', () => {
    expect(() => factory(undefined, createContext({}))).toThrow(/@CurrentUser\(\)/);
  });
});
