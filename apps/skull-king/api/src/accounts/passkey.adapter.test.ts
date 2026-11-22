import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const generateRegistrationOptions = vi.fn();
const generateAuthenticationOptions = vi.fn();
const verifyRegistrationResponse = vi.fn();
const verifyAuthenticationResponse = vi.fn();

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
}));

const {
  buildAuthenticationOptions,
  buildRegistrationOptions,
  checkAuthentication,
  checkRegistration,
} = await import('./passkey.adapter');

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const CHALLENGE = 'a-challenge';
const BROWSER_RESPONSE = { id: 'credential-1', rawId: 'credential-1', response: {} };
const STORED_PASSKEY = {
  credentialId: 'credential-1',
  publicKey: Buffer.from([1, 2, 3]),
  counter: 4,
};

async function attemptSignIn(response: unknown) {
  return await checkAuthentication({ response, challenge: CHALLENGE, passkey: STORED_PASSKEY });
}

// @FollowsBlueprint test-node-adapter
describe('passkey.adapter', () => {
  beforeEach(() => {
    process.env.WEBAUTHN_RELYING_PARTY_ID = 'localhost';
    process.env.WEBAUTHN_ORIGIN = 'http://localhost:5178';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.WEBAUTHN_RELYING_PARTY_ID;
    delete process.env.WEBAUTHN_ORIGIN;
  });

  it('asks for a discoverable passkey, so signing in later needs no name', async () => {
    generateRegistrationOptions.mockResolvedValue({ challenge: CHALLENGE });

    expect(await buildRegistrationOptions({ accountId: ACCOUNT_ID, name: 'Hugo' })).toEqual({
      challenge: CHALLENGE,
    });
    expect(generateRegistrationOptions).toHaveBeenCalledWith({
      rpID: 'localhost',
      rpName: 'Skull King',
      userID: new TextEncoder().encode(ACCOUNT_ID),
      userName: 'Hugo',
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
    });
  });

  it('asks for any passkey of this site to sign in, naming none', async () => {
    generateAuthenticationOptions.mockResolvedValue({ challenge: CHALLENGE });

    expect(await buildAuthenticationOptions()).toEqual({ challenge: CHALLENGE });
    expect(generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: 'localhost',
      userVerification: 'preferred',
    });
  });

  it('refuses to start without a relying party configured', async () => {
    delete process.env.WEBAUTHN_ORIGIN;

    await expect(buildAuthenticationOptions()).rejects.toThrow('WEBAUTHN_ORIGIN is not set');
  });

  it('keeps the credential of a verified registration', async () => {
    verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: { id: 'credential-1', publicKey: new Uint8Array([9]), counter: 0 },
      },
    });

    expect(await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE })).toEqual({
      credentialId: 'credential-1',
      publicKey: Buffer.from([9]),
      counter: 0,
    });
    expect(verifyRegistrationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: CHALLENGE,
        expectedOrigin: 'http://localhost:5178',
        expectedRPID: 'localhost',
      }),
    );
  });

  it('refuses a registration that is not a browser response, unverified, or thrown on', async () => {
    expect(await checkRegistration({ response: { nope: true }, challenge: CHALLENGE })).toBeNull();
    verifyRegistrationResponse.mockResolvedValueOnce({ verified: false });
    expect(
      await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE }),
    ).toBeNull();
    verifyRegistrationResponse.mockResolvedValueOnce({ verified: true });
    expect(
      await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE }),
    ).toBeNull();
    verifyRegistrationResponse.mockRejectedValueOnce(new Error('bad signature'));
    expect(
      await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE }),
    ).toBeNull();
  });

  it('answers the new counter of a verified sign-in', async () => {
    verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 5 },
    });

    expect(
      await checkAuthentication({
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
        passkey: STORED_PASSKEY,
      }),
    ).toEqual({ counter: 5 });
    expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        credential: { id: 'credential-1', publicKey: new Uint8Array([1, 2, 3]), counter: 4 },
      }),
    );
  });

  it('refuses a sign-in that is not a browser response, unverified, or thrown on', async () => {
    expect(await attemptSignIn({ nope: true })).toBeNull();
    verifyAuthenticationResponse.mockResolvedValueOnce({ verified: false });
    expect(await attemptSignIn(BROWSER_RESPONSE)).toBeNull();
    verifyAuthenticationResponse.mockRejectedValueOnce(new Error('bad signature'));
    expect(await attemptSignIn(BROWSER_RESPONSE)).toBeNull();
  });
});
