/**
 * @DependsOnExternal webauthn
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { RelyingParty } from './auth.environment';
import { isWebauthnResponse, parseTransports } from './passkey.core';

type RegistrationResponse = Parameters<typeof verifyRegistrationResponse>[0]['response'];
type AuthenticationResponse = Parameters<typeof verifyAuthenticationResponse>[0]['response'];

export type RegistrationOptions = PublicKeyCredentialCreationOptionsJSON;
export type AuthenticationOptions = PublicKeyCredentialRequestOptionsJSON;

export interface StoredPasskey {
  readonly credentialId: string;
  readonly publicKey: Buffer;
  readonly signCounter: number;
  readonly transports: string;
}

export interface RegistrationVerdict {
  readonly credentialId: string;
  readonly publicKey: Buffer;
  readonly signCounter: number;
}

export interface AuthenticationVerdict {
  readonly signCounter: number;
}

const USER_VERIFICATION = 'preferred';
const OWNER_ID = 'owner';
const OWNER_NAME = 'owner';
const OWNER_DISPLAY_NAME = 'Propriétaire';

function isRegistrationResponse(value: unknown): value is RegistrationResponse {
  return isWebauthnResponse(value);
}

function isAuthenticationResponse(value: unknown): value is AuthenticationResponse {
  return isWebauthnResponse(value);
}

// @FollowsBlueprint adapter-external-service
export async function buildRegistrationOptions(params: {
  readonly relyingParty: RelyingParty;
  readonly existing: readonly StoredPasskey[];
}): Promise<RegistrationOptions> {
  return await generateRegistrationOptions({
    rpID: params.relyingParty.id,
    rpName: params.relyingParty.name,
    userID: new TextEncoder().encode(OWNER_ID),
    userName: OWNER_NAME,
    userDisplayName: OWNER_DISPLAY_NAME,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: USER_VERIFICATION },
    excludeCredentials: params.existing.map((passkey) => ({
      id: passkey.credentialId,
      transports: parseTransports(passkey.transports),
    })),
  });
}

export async function buildAuthenticationOptions(
  relyingParty: RelyingParty,
): Promise<AuthenticationOptions> {
  return await generateAuthenticationOptions({
    rpID: relyingParty.id,
    userVerification: USER_VERIFICATION,
  });
}

export async function checkRegistration(params: {
  readonly relyingParty: RelyingParty;
  readonly response: unknown;
  readonly challenge: string;
}): Promise<RegistrationVerdict | null> {
  if (!isRegistrationResponse(params.response)) return null;
  try {
    const verification = await verifyRegistrationResponse({
      response: params.response,
      expectedChallenge: params.challenge,
      expectedOrigin: params.relyingParty.origins,
      expectedRPID: params.relyingParty.id,
      requireUserVerification: false,
    });
    // Stryker disable next-line ConditionalExpression: equivalent mutant, an unverified registration carries no registrationInfo, so reading its credential throws into the catch below and answers the same null.
    if (!verification.verified) return null;
    const credential = verification.registrationInfo.credential;
    return {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      signCounter: credential.counter,
    };
  } catch {
    return null;
  }
}

export async function checkAuthentication(params: {
  readonly relyingParty: RelyingParty;
  readonly response: unknown;
  readonly challenge: string;
  readonly passkey: StoredPasskey;
}): Promise<AuthenticationVerdict | null> {
  if (!isAuthenticationResponse(params.response)) return null;
  try {
    const verification = await verifyAuthenticationResponse({
      response: params.response,
      expectedChallenge: params.challenge,
      expectedOrigin: params.relyingParty.origins,
      expectedRPID: params.relyingParty.id,
      requireUserVerification: false,
      credential: {
        id: params.passkey.credentialId,
        publicKey: new Uint8Array(params.passkey.publicKey),
        counter: params.passkey.signCounter,
        transports: parseTransports(params.passkey.transports),
      },
    });
    if (!verification.verified) return null;
    return { signCounter: verification.authenticationInfo.newCounter };
  } catch {
    return null;
  }
}
