import { parseSignInRefusal, type SignInRefusal } from '@domain/sign-in.core';
import { z } from 'zod';

export type SignInFailure = SignInRefusal | 'unavailable';

export interface AccountSession {
  readonly signedIn: boolean;
}

export type AccountLinkView = 'hidden' | 'signed-out' | 'signed-in';

const UNAUTHORIZED_STATUS = 401;
const LOWEST_SUCCESS_STATUS = 200;
const LOWEST_REDIRECT_STATUS = 300;

export class SignInRefusedError extends Error {
  readonly failure: SignInFailure;

  constructor(failure: SignInFailure) {
    super(`The sign-in was refused: ${failure}.`);
    this.name = 'SignInRefusedError';
    this.failure = failure;
  }
}

const refusalBodySchema = z.object({ error: z.unknown() });
const accountSessionSchema = z.object({ signedIn: z.boolean() });

// @FollowsBlueprint core-decision
export function readSignInFailure(body: unknown): SignInFailure {
  const refusalBody = refusalBodySchema.safeParse(body);
  const refusal = refusalBody.success ? parseSignInRefusal(refusalBody.data.error) : null;
  return refusal ?? 'unavailable';
}

export function selectSignInFailure(error: unknown): SignInFailure {
  return error instanceof SignInRefusedError ? error.failure : 'unavailable';
}

export function selectAccountLinkView(session: AccountSession | undefined): AccountLinkView {
  if (session === undefined) return 'hidden';
  return session.signedIn ? 'signed-in' : 'signed-out';
}

export function isSuccessStatus(status: number): boolean {
  return status >= LOWEST_SUCCESS_STATUS && status < LOWEST_REDIRECT_STATUS;
}

export function isSignedOutAnswer(status: number): boolean {
  return isSuccessStatus(status) || status === UNAUTHORIZED_STATUS;
}

export function readAccountSession(body: unknown): AccountSession | null {
  const session = accountSessionSchema.safeParse(body);
  return session.success ? { signedIn: session.data.signedIn } : null;
}
