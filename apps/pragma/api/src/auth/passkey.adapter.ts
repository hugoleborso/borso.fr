/**
 * @DependsOnExternal webauthn
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { readRelyingParty } from './auth.environment';
import { isWebauthnResponse, parseTransports } from './passkey.core';

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
  readonly signCounter: number;
  readonly transports: string;
}

export interface RegistrationVerdict {
  readonly verified: boolean;
  readonly credentialId: string;
  readonly publicKey: Buffer;
  readonly signCounter: number;
}

export interface AuthenticationVerdict {
  readonly verified: boolean;
  readonly signCounter: number;
}

const USER_VERIFICATION = 'preferred';

// @FollowsBlueprint adapter-external-service
export async function buildRegistrationOptions(params: {
  readonly memberId: string;
  readonly username: string;
  readonly existing: readonly StoredPasskey[];
}): Promise<Record<string, unknown>> {
  const relyingParty = readRelyingParty();
  const options = await generateRegistrationOptions({
    rpID: relyingParty.id,
    rpName: relyingParty.name,
    userID: new TextEncoder().encode(params.memberId),
    userName: params.username,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: USER_VERIFICATION },
    excludeCredentials: params.existing.map((passkey) => ({
      id: passkey.credentialId,
      transports: parseTransports(passkey.transports),
    })),
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

export async function checkRegistration(params: {
  readonly response: unknown;
  readonly challenge: string;
}): Promise<RegistrationVerdict | null> {
  const relyingParty = readRelyingParty();
  if (!isRegistrationResponse(params.response)) return null;
  const response = params.response;
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: params.challenge,
      expectedOrigin: relyingParty.origin,
      expectedRPID: relyingParty.id,
      requireUserVerification: false,
    });
    const info = verification.registrationInfo;
    if (!verification.verified) return null;
    // Stryker disable next-line ConditionalExpression: equivalent mutant. Without the guard the next line reads `info.credential`, which throws into the catch below and answers the same null.
    if (info === undefined) return null;
    return {
      verified: true,
      credentialId: info.credential.id,
      publicKey: Buffer.from(info.credential.publicKey),
      signCounter: info.credential.counter,
    };
  } catch {
    return null;
  }
}

export async function checkAuthentication(params: {
  readonly response: unknown;
  readonly challenge: string;
  readonly passkey: StoredPasskey;
}): Promise<AuthenticationVerdict | null> {
  const relyingParty = readRelyingParty();
  if (!isAuthenticationResponse(params.response)) return null;
  const response = params.response;
  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: params.challenge,
      expectedOrigin: relyingParty.origin,
      expectedRPID: relyingParty.id,
      requireUserVerification: false,
      credential: {
        id: params.passkey.credentialId,
        publicKey: new Uint8Array(params.passkey.publicKey),
        counter: params.passkey.signCounter,
        transports: parseTransports(params.passkey.transports),
      },
    });
    if (!verification.verified) return null;
    return { verified: true, signCounter: verification.authenticationInfo.newCounter };
  } catch {
    return null;
  }
}
