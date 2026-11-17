import { toSafeReturnTo, withSignInFailed } from './return-to.utils';

describe('toSafeReturnTo', () => {
  it.each([
    ['a dot segment before a second slash', '/.//evil.example'],
    ['a parent segment before a second slash', '/..//evil.example'],
    ['a parent segment after a path before a second slash', '/a/..//evil.example'],
    ['an encoded dot segment before a second slash', '/%2e//evil.example'],
    ['an encoded parent segment before a second slash', '/%2e%2e//evil.example'],
    ['a protocol-relative URL', '//evil.example'],
    ['a backslash after the first slash', '/\\evil.example'],
    ['a tab between the slashes', '/\t/evil.example'],
    ['a newline between the slashes', '/\n/evil.example'],
    ['an absolute URL', 'https://evil.example'],
    ['a javascript URL', 'javascript:alert(1)'],
    ['an empty string', ''],
    ['a path longer than 2000 characters', `/${'a'.repeat(2000)}`],
  ])('falls back to "/" for %s', (_case: string, value: string) => {
    expect(toSafeReturnTo(value)).toBe('/');
  });

  it.each([undefined, null, 42, ['/people'], { path: '/people' }])('falls back to "/" for the non-string %j', (value: unknown) => {
    expect(toSafeReturnTo(value)).toBe('/');
  });

  it.each([
    ['/', '/'],
    ['/people?x=1#y', '/people?x=1#y'],
    ['/a/../b', '/b'],
    ['/./people', '/people'],
    ['/%2F%2Fevil.example', '/%2F%2Fevil.example'],
  ])('keeps the path on this site for %j', (value: string, expected: string) => {
    expect(toSafeReturnTo(value)).toBe(expected);
  });

  it('keeps a path of exactly 2000 characters', () => {
    const value = `/${'a'.repeat(1999)}`;

    expect(toSafeReturnTo(value)).toBe(value);
  });
});

describe('withSignInFailed', () => {
  it('marks a path without a query', () => {
    expect(withSignInFailed('/people')).toBe('/people?signIn=failed');
  });

  it('keeps the existing query and fragment', () => {
    expect(withSignInFailed('/people?x=1#y')).toBe('/people?x=1&signIn=failed#y');
  });

  it('replaces an existing sign-in result instead of adding a second one', () => {
    expect(withSignInFailed('/people?signIn=other')).toBe('/people?signIn=failed');
  });

  it('marks the home page for an unsafe return path', () => {
    expect(withSignInFailed('//evil.example')).toBe('/?signIn=failed');
  });
});
