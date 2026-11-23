/**
 * @DependsOnExternal webauthn
 */

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { z } from 'zod';

type RegistrationOptions = Parameters<typeof startRegistration>[0]['optionsJSON'];
type AuthenticationOptions = Parameters<typeof startAuthentication>[0]['optionsJSON'];

const optionsSchema = z.object({ challenge: z.string().min(1) });

function isRegistrationOptions(value: unknown): value is RegistrationOptions {
  return optionsSchema.safeParse(value).success;
}

function isAuthenticationOptions(value: unknown): value is AuthenticationOptions {
  return optionsSchema.safeParse(value).success;
}

// @FollowsBlueprint adapter-external-service
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
