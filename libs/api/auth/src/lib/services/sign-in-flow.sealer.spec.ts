import { EncryptJWT } from 'jose';
import { createHash } from 'node:crypto';
import { AuthModuleOptions, SignInFlow } from '../types';
import { SignInFlowSealer } from './sign-in-flow.sealer';

const SECRET = 'a-secret-of-at-least-thirty-two-characters';
const FLOW: SignInFlow = { state: 'state-1', nonce: 'nonce-1', codeVerifier: 'verifier-1', returnTo: '/people?x=1' };

function createSealer(secret: string = SECRET): SignInFlowSealer {
  return new SignInFlowSealer({ secret } as AuthModuleOptions);
}

// Encrypts any payload with the key the sealer derives from SECRET.
function encryptWithSealerKey(payload: Record<string, unknown>): Promise<string> {
  const key = createHash('sha256').update(`sign-in-flow:${SECRET}`).digest();

  return new EncryptJWT(payload).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).setIssuedAt().setExpirationTime('10m').encrypt(key);
}

describe('SignInFlowSealer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the flow it sealed', async () => {
    const sealer = createSealer();

    expect(await sealer.open(await sealer.seal(FLOW))).toEqual(FLOW);
  });

  it('does not put the flow into the value in plain text', async () => {
    const sealed = await createSealer().seal(FLOW);

    expect(sealed).not.toContain('verifier-1');
    expect(Buffer.from(sealed.split('.')[1] ?? '', 'base64url').toString()).not.toContain('verifier-1');
  });

  it('rejects a changed value', async () => {
    const sealer = createSealer();
    const parts = (await sealer.seal(FLOW)).split('.');
    const ciphertext = parts[3];
    parts[3] = `${ciphertext[0] === 'A' ? 'B' : 'A'}${ciphertext.slice(1)}`;

    expect(await sealer.open(parts.join('.'))).toBeNull();
  });

  it('rejects a value sealed with another secret', async () => {
    const sealed = await createSealer('another-secret-of-at-least-thirty-two-chars').seal(FLOW);

    expect(await createSealer().open(sealed)).toBeNull();
  });

  it('rejects a value older than 10 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T10:00:00Z'));
    const sealer = createSealer();
    const sealed = await sealer.seal(FLOW);

    vi.setSystemTime(new Date('2026-11-17T10:09:00Z'));
    expect(await sealer.open(sealed)).toEqual(FLOW);

    vi.setSystemTime(new Date('2026-11-17T10:11:00Z'));
    expect(await sealer.open(sealed)).toBeNull();
  });

  it.each([null, ''])('returns null for the missing value %j', async (value: string | null) => {
    expect(await createSealer().open(value)).toBeNull();
  });

  it('returns null for a value that is not a sealed flow', async () => {
    expect(await createSealer().open('not-a-jwe')).toBeNull();
  });

  it('returns null when a field of the flow is not a string', async () => {
    const sealed = await encryptWithSealerKey({ ...FLOW, codeVerifier: 42 });

    expect(await createSealer().open(sealed)).toBeNull();
  });

  it('returns null when a field of the flow is missing', async () => {
    const sealed = await encryptWithSealerKey({ state: FLOW.state, nonce: FLOW.nonce, codeVerifier: FLOW.codeVerifier });

    expect(await createSealer().open(sealed)).toBeNull();
  });
});
