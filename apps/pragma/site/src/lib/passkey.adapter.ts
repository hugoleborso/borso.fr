/**
 * @DependsOnExternal webauthn
 */

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

type RegistrationOptions = Parameters<typeof startRegistration>[0]['optionsJSON'];
type AuthenticationOptions = Parameters<typeof startAuthentication>[0]['optionsJSON'];

function isRegistrationOptions(value: unknown): value is RegistrationOptions {
  return typeof value === 'object' && value !== null && 'challenge' in value;
}

function isAuthenticationOptions(value: unknown): value is AuthenticationOptions {
  return typeof value === 'object' && value !== null && 'challenge' in value;
}

// @FollowsBlueprint adapter-direct-upload
export async function startPasskeyEnrolment(options: unknown): Promise<unknown> {
  if (!isRegistrationOptions(options)) throw new Error('passkey options were not understood');
  return await startRegistration({ optionsJSON: options });
}

export async function startPasskeyLogin(options: unknown): Promise<unknown> {
  if (!isAuthenticationOptions(options)) throw new Error('passkey options were not understood');
  return await startAuthentication({ optionsJSON: options });
}

export function isPasskeySupported(): boolean {
  return typeof globalThis.PublicKeyCredential === 'function';
}
