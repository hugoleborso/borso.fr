import type { SignInRefusal } from '@domain/sign-in.core';
import { z } from 'zod';
import { parseJsonOrNull } from '../helpers/json/json.core';

const operatorSessionPayloadSchema = z.object({
  credentialId: z.guid(),
  epoch: z.number().int().nonnegative(),
  issuedAt: z.number(),
  expiresAt: z.number(),
});

export type OperatorSessionPayload = z.infer<typeof operatorSessionPayloadSchema>;

export type OperatorSessionVerdict = 'valid' | 'expired' | 'stale-epoch' | 'unknown-credential';

export interface KnownCredentialEpoch {
  readonly id: string;
  readonly sessionEpoch: number;
}

export const OPERATOR_CREDENTIAL_ID = '0b5e0000-0000-4000-8000-000000000001';
export const SIGNING_KEY_ID = 'session-signing-key';

export type SignInRefusalStatus = 401 | 429 | 503;

const STATUS_BY_REFUSAL: Readonly<Record<SignInRefusal, SignInRefusalStatus>> = {
  'invalid-credentials': 401,
  'rate-limited': 429,
  'auth-not-bootstrapped': 503,
};

export interface SignInFacts<Credential> {
  readonly isRateLimited: boolean;
  readonly credential: Credential | null;
  readonly signingKey: string | null;
  readonly isPasswordRight: boolean;
}

export interface SignInRefused {
  readonly kind: 'refused';
  readonly refusal: SignInRefusal;
  readonly status: SignInRefusalStatus;
}

export type SignInDecision<Credential> =
  | { readonly kind: 'signed-in'; readonly credential: Credential; readonly signingKey: string }
  | SignInRefused;

// @FollowsBlueprint core-decision
export function buildOperatorSessionPayload(
  credential: KnownCredentialEpoch,
  nowMillis: number,
  sessionTtlMillis: number,
): OperatorSessionPayload {
  return {
    credentialId: credential.id,
    epoch: credential.sessionEpoch,
    issuedAt: nowMillis,
    expiresAt: nowMillis + sessionTtlMillis,
  };
}

export function parseOperatorSessionPayload(raw: string): OperatorSessionPayload | null {
  const session = operatorSessionPayloadSchema.safeParse(parseJsonOrNull(raw));
  return session.success ? session.data : null;
}

export function judgeOperatorSession(
  payload: OperatorSessionPayload,
  credential: KnownCredentialEpoch | null,
  nowMillis: number,
): OperatorSessionVerdict {
  if (nowMillis >= payload.expiresAt) return 'expired';
  if (credential === null || credential.id !== payload.credentialId) return 'unknown-credential';
  if (credential.sessionEpoch !== payload.epoch) return 'stale-epoch';
  return 'valid';
}

function buildRefusal(refusal: SignInRefusal): SignInRefused {
  return { kind: 'refused', refusal, status: STATUS_BY_REFUSAL[refusal] };
}

export function selectCredentialToVerify<Credential>(
  isRateLimited: boolean,
  credential: Credential | null,
): Credential | null {
  return isRateLimited ? null : credential;
}

export function decideSignIn<Credential>(
  facts: SignInFacts<Credential>,
): SignInDecision<Credential> {
  if (facts.isRateLimited) return buildRefusal('rate-limited');
  if (facts.credential === null || facts.signingKey === null) {
    return buildRefusal('auth-not-bootstrapped');
  }
  if (!facts.isPasswordRight) return buildRefusal('invalid-credentials');
  return { kind: 'signed-in', credential: facts.credential, signingKey: facts.signingKey };
}
