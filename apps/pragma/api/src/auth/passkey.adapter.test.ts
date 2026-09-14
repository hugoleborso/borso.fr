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

const MEMBER_ID = '11111111-2222-3333-4444-555555555555';
const CHALLENGE = 'a-challenge';
const BROWSER_RESPONSE = {
  id: 'credential-1',
  rawId: 'credential-1',
  response: {},
  type: 'public-key',
};

const STORED_PASSKEY = {
  credentialId: 'credential-1',
  publicKey: Buffer.from([1, 2, 3]),
  signCounter: 4,
  transports: JSON.stringify(['internal']),
};

describe('passkey.adapter', () => {
  beforeEach(() => {
    process.env.WEBAUTHN_RELYING_PARTY_ID = 'localhost';
    process.env.WEBAUTHN_ORIGIN = 'http://localhost:5173';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.WEBAUTHN_RELYING_PARTY_ID;
    delete process.env.WEBAUTHN_ORIGIN;
  });

  it('asks for registration options excluding the passkeys already enrolled', async () => {
    generateRegistrationOptions.mockResolvedValue({ challenge: CHALLENGE });
    const options = await buildRegistrationOptions({
      memberId: MEMBER_ID,
      username: 'ada',
      existing: [STORED_PASSKEY],
    });
    expect(options).toEqual({ challenge: CHALLENGE });
    const call: unknown = generateRegistrationOptions.mock.calls[0]?.[0];
    expect(call).toEqual({
      rpID: 'localhost',
      rpName: 'pragma',
      userID: new TextEncoder().encode(MEMBER_ID),
      userName: 'ada',
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
      excludeCredentials: [{ id: 'credential-1', transports: ['internal'] }],
    });
  });

  it('asks for authentication options bound to the relying party', async () => {
    generateAuthenticationOptions.mockResolvedValue({ challenge: CHALLENGE });
    expect(await buildAuthenticationOptions()).toEqual({ challenge: CHALLENGE });
    expect(generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: 'localhost',
      userVerification: 'preferred',
    });
  });

  it('refuses a payload that is not a browser response, without calling the library', async () => {
    expect(await checkRegistration({ response: { nope: true }, challenge: CHALLENGE })).toBeNull();
    expect(
      await checkAuthentication({
        response: null,
        challenge: CHALLENGE,
        passkey: STORED_PASSKEY,
      }),
    ).toBeNull();
    expect(verifyRegistrationResponse).not.toHaveBeenCalled();
    expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
  });

  it('asks the library to check the response against this stage and this challenge', async () => {
    verifyRegistrationResponse.mockResolvedValue({ verified: false });
    await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE });
    expect(verifyRegistrationResponse).toHaveBeenCalledWith({
      response: BROWSER_RESPONSE,
      expectedChallenge: CHALLENGE,
      expectedOrigin: 'http://localhost:5173',
      expectedRPID: 'localhost',
      requireUserVerification: false,
    });

    verifyAuthenticationResponse.mockResolvedValue({ verified: false });
    await checkAuthentication({
      response: BROWSER_RESPONSE,
      challenge: CHALLENGE,
      passkey: STORED_PASSKEY,
    });
    expect(verifyAuthenticationResponse).toHaveBeenCalledWith({
      response: BROWSER_RESPONSE,
      expectedChallenge: CHALLENGE,
      expectedOrigin: 'http://localhost:5173',
      expectedRPID: 'localhost',
      requireUserVerification: false,
      credential: {
        id: 'credential-1',
        publicKey: new Uint8Array([1, 2, 3]),
        counter: 4,
        transports: ['internal'],
      },
    });
  });

  it('answers null for a registration the library says is unverified even with a credential', async () => {
    verifyRegistrationResponse.mockResolvedValue({
      verified: false,
      registrationInfo: {
        credential: { id: 'credential-1', publicKey: new Uint8Array([9, 8]), counter: 0 },
      },
    });
    expect(
      await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE }),
    ).toBeNull();
  });

  it('returns the credential the library extracted from a verified registration', async () => {
    verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: { id: 'credential-1', publicKey: new Uint8Array([9, 8]), counter: 0 },
      },
    });
    expect(await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE })).toEqual({
      verified: true,
      credentialId: 'credential-1',
      publicKey: Buffer.from([9, 8]),
      signCounter: 0,
    });
  });

  it('answers null when the library verifies nothing', async () => {
    verifyRegistrationResponse.mockResolvedValue({ verified: false });
    expect(
      await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE }),
    ).toBeNull();
  });

  it('answers null when a verified registration carries no credential', async () => {
    verifyRegistrationResponse.mockResolvedValue({ verified: true, registrationInfo: undefined });
    expect(
      await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE }),
    ).toBeNull();
  });

  it('answers null rather than throwing when the library rejects a registration', async () => {
    verifyRegistrationResponse.mockRejectedValue(new Error('bad attestation'));
    expect(
      await checkRegistration({ response: BROWSER_RESPONSE, challenge: CHALLENGE }),
    ).toBeNull();
  });

  it('returns the new counter of a verified assertion', async () => {
    verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 7 },
    });
    expect(
      await checkAuthentication({
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
        passkey: STORED_PASSKEY,
      }),
    ).toEqual({ verified: true, signCounter: 7 });
  });

  it('answers null when an assertion does not verify, counter or no counter', async () => {
    verifyAuthenticationResponse.mockResolvedValue({
      verified: false,
      authenticationInfo: { newCounter: 9 },
    });
    expect(
      await checkAuthentication({
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
        passkey: STORED_PASSKEY,
      }),
    ).toBeNull();
  });

  it('answers null rather than throwing when the library rejects an assertion', async () => {
    verifyAuthenticationResponse.mockRejectedValue(new Error('bad assertion'));
    expect(
      await checkAuthentication({
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
        passkey: STORED_PASSKEY,
      }),
    ).toBeNull();
  });

  it('raises the slice error when the relying party is not configured', async () => {
    delete process.env.WEBAUTHN_RELYING_PARTY_ID;
    await expect(buildAuthenticationOptions()).rejects.toThrow(
      'WEBAUTHN_RELYING_PARTY_ID is not set',
    );
  });
});
