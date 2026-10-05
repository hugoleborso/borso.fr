import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const RELYING_PARTY = {
  id: 'talos.borso.fr',
  name: 'Talos',
  origins: ['https://talos.borso.fr'],
};
const CHALLENGE = 'un-defi';
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

// @FollowsBlueprint test-node-adapter
describe('passkey.adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks for a discoverable passkey for the owner, excluding the passkeys already enrolled', async () => {
    generateRegistrationOptions.mockResolvedValue({ challenge: CHALLENGE });
    expect(
      await buildRegistrationOptions({ relyingParty: RELYING_PARTY, existing: [STORED_PASSKEY] }),
    ).toEqual({ challenge: CHALLENGE });
    expect(generateRegistrationOptions).toHaveBeenCalledWith({
      rpID: 'talos.borso.fr',
      rpName: 'Talos',
      userID: new TextEncoder().encode('owner'),
      userName: 'owner',
      userDisplayName: 'Propriétaire',
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      excludeCredentials: [{ id: 'credential-1', transports: ['internal'] }],
    });
  });

  it('asks for authentication options bound to the relying party', async () => {
    generateAuthenticationOptions.mockResolvedValue({ challenge: CHALLENGE });
    expect(await buildAuthenticationOptions(RELYING_PARTY)).toEqual({ challenge: CHALLENGE });
    expect(generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: 'talos.borso.fr',
      userVerification: 'preferred',
    });
  });

  it('refuses a payload that is not a browser response without calling the library', async () => {
    expect(
      await checkRegistration({ relyingParty: RELYING_PARTY, response: {}, challenge: CHALLENGE }),
    ).toBeNull();
    expect(
      await checkAuthentication({
        relyingParty: RELYING_PARTY,
        response: null,
        challenge: CHALLENGE,
        passkey: STORED_PASSKEY,
      }),
    ).toBeNull();
    expect(verifyRegistrationResponse).not.toHaveBeenCalled();
    expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
  });

  it('checks a registration against every accepted origin and returns the credential', async () => {
    verifyRegistrationResponse.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: { id: 'credential-1', publicKey: new Uint8Array([9, 8]), counter: 0 },
      },
    });
    expect(
      await checkRegistration({
        relyingParty: RELYING_PARTY,
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
      }),
    ).toEqual({ credentialId: 'credential-1', publicKey: Buffer.from([9, 8]), signCounter: 0 });
    expect(verifyRegistrationResponse).toHaveBeenCalledWith({
      response: BROWSER_RESPONSE,
      expectedChallenge: CHALLENGE,
      expectedOrigin: ['https://talos.borso.fr'],
      expectedRPID: 'talos.borso.fr',
      requireUserVerification: false,
    });
  });

  it('answers null for a registration the library does not verify', async () => {
    verifyRegistrationResponse.mockResolvedValue({ verified: false });
    expect(
      await checkRegistration({
        relyingParty: RELYING_PARTY,
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
      }),
    ).toBeNull();
  });

  it('answers null rather than throwing when the library rejects a registration', async () => {
    verifyRegistrationResponse.mockRejectedValue(new Error('attestation invalide'));
    expect(
      await checkRegistration({
        relyingParty: RELYING_PARTY,
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
      }),
    ).toBeNull();
  });

  it('checks an assertion against the stored passkey and returns the new counter', async () => {
    verifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 7 },
    });
    expect(
      await checkAuthentication({
        relyingParty: RELYING_PARTY,
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
        passkey: STORED_PASSKEY,
      }),
    ).toEqual({ signCounter: 7 });
    expect(verifyAuthenticationResponse).toHaveBeenCalledWith({
      response: BROWSER_RESPONSE,
      expectedChallenge: CHALLENGE,
      expectedOrigin: ['https://talos.borso.fr'],
      expectedRPID: 'talos.borso.fr',
      requireUserVerification: false,
      credential: {
        id: 'credential-1',
        publicKey: new Uint8Array([1, 2, 3]),
        counter: 4,
        transports: ['internal'],
      },
    });
  });

  it('answers null for an assertion the library does not verify, counter or not', async () => {
    verifyAuthenticationResponse.mockResolvedValue({
      verified: false,
      authenticationInfo: { newCounter: 9 },
    });
    expect(
      await checkAuthentication({
        relyingParty: RELYING_PARTY,
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
        passkey: STORED_PASSKEY,
      }),
    ).toBeNull();
  });

  it('answers null rather than throwing when the library rejects an assertion', async () => {
    verifyAuthenticationResponse.mockRejectedValue(new Error('signature invalide'));
    expect(
      await checkAuthentication({
        relyingParty: RELYING_PARTY,
        response: BROWSER_RESPONSE,
        challenge: CHALLENGE,
        passkey: STORED_PASSKEY,
      }),
    ).toBeNull();
  });
});
