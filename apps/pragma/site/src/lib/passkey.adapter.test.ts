import { afterEach, describe, expect, it, vi } from 'vitest';

const startRegistration = vi.fn();
const startAuthentication = vi.fn();

vi.mock('@simplewebauthn/browser', () => ({ startRegistration, startAuthentication }));

const { isPasskeySupported, startPasskeyEnrolment, startPasskeyLogin } =
  await import('./passkey.adapter');

const OPTIONS = { challenge: 'a-challenge' };

describe('passkey.adapter', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('refuses options that carry no challenge', async () => {
    await expect(startPasskeyEnrolment({})).rejects.toThrow('passkey options were not understood');
    await expect(startPasskeyLogin(null)).rejects.toThrow('passkey options were not understood');
    expect(startRegistration).not.toHaveBeenCalled();
    expect(startAuthentication).not.toHaveBeenCalled();
  });

  it('hands the options to the browser and returns what it produced', async () => {
    startRegistration.mockResolvedValue({ id: 'attestation' });
    startAuthentication.mockResolvedValue({ id: 'assertion' });
    expect(await startPasskeyEnrolment(OPTIONS)).toEqual({ id: 'attestation' });
    expect(await startPasskeyLogin(OPTIONS)).toEqual({ id: 'assertion' });
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: OPTIONS });
    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: OPTIONS });
  });

  it('reports support from the presence of the browser credential API', () => {
    expect(isPasskeySupported()).toBe(false);
    vi.stubGlobal('PublicKeyCredential', function PublicKeyCredential() {
      return null;
    });
    expect(isPasskeySupported()).toBe(true);
  });
});
