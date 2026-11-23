/**
 * @DependsOnExternal webauthn
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { readRelyingParty } from './accounts.environment';
import { isWebauthnResponse } from './passkey.core';

type RegistrationResponse = Parameters<typeof verifyRegistrationResponse>[0]['response'];
type AuthenticationResponse = Parameters<typeof verifyAuthenticationResponse>[0]['response'];

function isRegistrationResponse(value: unknown): value is RegistrationResponse {
  return isWebauthnResponse(value);
}

function isAuthenticationResponse(value: unknown): value is AuthenticationResponse {
  return isWebauthnResponse(value);
}

export interface StoredPasskey {
  readonly credentialId: string;
  readonly publicKey: Buffer;
  readonly counter: number;
}

export interface RegistrationVerdict {
  readonly credentialId: string;
  readonly publicKey: Buffer;
  readonly counter: number;
}

export interface AuthenticationVerdict {
  readonly counter: number;
}

const USER_VERIFICATION = 'preferred';

// @FollowsBlueprint adapter-external-service
export async function buildRegistrationOptions(params: {
  readonly accountId: string;
  readonly name: string;
}): Promise<Record<string, unknown>> {
  const relyingParty = readRelyingParty();
  const options = await generateRegistrationOptions({
    rpID: relyingParty.id,
    rpName: relyingParty.name,
    userID: new TextEncoder().encode(params.accountId),
    userName: params.name,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: USER_VERIFICATION },
  });
  return { ...options };
}

export async function buildAuthenticationOptions(): Promise<Record<string, unknown>> {
  const relyingParty = readRelyingParty();
  const options = await generateAuthenticationOptions({
    rpID: relyingParty.id,
    userVerification: USER_VERIFICATION,
  });
  return { ...options };
}

async function attemptVerification<Verification>(
  verify: () => Promise<Verification>,
): Promise<Verification | null> {
  try {
    return await verify();
  } catch {
    return null;
  }
}

export async function checkRegistration(params: {
  readonly response: unknown;
  readonly challenge: string;
}): Promise<RegistrationVerdict | null> {
  const relyingParty = readRelyingParty();
  const { response } = params;
  if (!isRegistrationResponse(response)) return null;
  const verification = await attemptVerification(
    async () =>
      await verifyRegistrationResponse({
        response,
        expectedChallenge: params.challenge,
        expectedOrigin: relyingParty.origin,
        expectedRPID: relyingParty.id,
        requireUserVerification: false,
      }),
  );
  if (verification === null) return null;
  if (!verification.verified) return null;
  const info = verification.registrationInfo;
  return {
    credentialId: info.credential.id,
    publicKey: Buffer.from(info.credential.publicKey),
    counter: info.credential.counter,
  };
}

export async function checkAuthentication(params: {
  readonly response: unknown;
  readonly challenge: string;
  readonly passkey: StoredPasskey;
}): Promise<AuthenticationVerdict | null> {
  const relyingParty = readRelyingParty();
  const { response } = params;
  if (!isAuthenticationResponse(response)) return null;
  const verification = await attemptVerification(
    async () =>
      await verifyAuthenticationResponse({
        response,
        expectedChallenge: params.challenge,
        expectedOrigin: relyingParty.origin,
        expectedRPID: relyingParty.id,
        requireUserVerification: false,
        credential: {
          id: params.passkey.credentialId,
          publicKey: new Uint8Array(params.passkey.publicKey),
          counter: params.passkey.counter,
        },
      }),
  );
  if (verification === null) return null;
  if (!verification.verified) return null;
  return { counter: verification.authenticationInfo.newCounter };
}
