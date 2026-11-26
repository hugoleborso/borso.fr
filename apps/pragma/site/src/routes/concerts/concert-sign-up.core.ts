/** @Feature concert-registrations */

import { z } from 'zod';
import type {
  SuggestionMessageKey,
  SuggestionOutcome,
} from '../../components/organisms/suggest-song.core';
import type { OpeningOverlay } from '../../components/organisms/session-gate.core';
import {
  REGISTRATION_EMAIL_MAX_LENGTH,
  REGISTRATION_FIRST_NAME_MAX_LENGTH,
} from '@domain/input-limits.core';
import { ApiError } from '../../lib/api.client';

export const FIRST_NAME_INPUT_MAX_LENGTH = REGISTRATION_FIRST_NAME_MAX_LENGTH;
export const EMAIL_INPUT_MAX_LENGTH = REGISTRATION_EMAIL_MAX_LENGTH;

export const signUpFormSchema = z.object({
  firstName: z.string().trim().min(1).max(REGISTRATION_FIRST_NAME_MAX_LENGTH),
  email: z.string().trim().max(REGISTRATION_EMAIL_MAX_LENGTH).pipe(z.email()),
});

export type SignUpFormValues = z.input<typeof signUpFormSchema>;

export type SignUpErrorKey =
  | 'concerts.alreadyRegistered'
  | 'concerts.notUpcoming'
  | 'concerts.disposableEmail'
  | 'concerts.rateLimited'
  | 'concerts.signUpFailed';

export type SignUpErrorPlace = 'email' | 'form';

export interface SignUpError {
  readonly key: SignUpErrorKey;
  readonly place: SignUpErrorPlace;
}

const SIGN_UP_ERROR_BY_REASON: ReadonlyMap<string, SignUpError> = new Map([
  ['already-registered', { key: 'concerts.alreadyRegistered', place: 'email' }],
  ['disposable-email', { key: 'concerts.disposableEmail', place: 'email' }],
  ['not-an-upcoming-concert', { key: 'concerts.notUpcoming', place: 'form' }],
  ['rate-limited', { key: 'concerts.rateLimited', place: 'form' }],
]);

const SIGN_UP_FAILED: SignUpError = { key: 'concerts.signUpFailed', place: 'form' };

const refusalBodySchema = z.object({ error: z.string() });

function findByRefusalReason<Value>(
  byReason: ReadonlyMap<string, Value>,
  body: unknown,
): Value | undefined {
  const checked = refusalBodySchema.safeParse(body);
  return checked.success ? byReason.get(checked.data.error) : undefined;
}

// @FollowsBlueprint core-label-key
export function selectSignUpError(error: unknown): SignUpError {
  const known =
    error instanceof ApiError
      ? findByRefusalReason(SIGN_UP_ERROR_BY_REASON, error.body)
      : undefined;
  return known ?? SIGN_UP_FAILED;
}

export type FollowUpErrorKey =
  | 'concerts.followUpTokenRefused'
  | 'concerts.followUpTrackRefused'
  | 'concerts.followUpSearchUnavailable'
  | 'concerts.rateLimited'
  | 'concerts.followUpFailed';

const FOLLOW_UP_ERROR_KEY_BY_REASON: ReadonlyMap<string, FollowUpErrorKey> = new Map([
  ['invalid-registration-token', 'concerts.followUpTokenRefused'],
  ['unknown-member', 'concerts.followUpFailed'],
  ['unknown-track', 'concerts.followUpTrackRefused'],
  ['external-search-unavailable', 'concerts.followUpSearchUnavailable'],
  ['rate-limited', 'concerts.rateLimited'],
]);

export function selectFollowUpErrorKey(error: unknown): FollowUpErrorKey | null {
  if (error === null || error === undefined) return null;
  const known =
    error instanceof ApiError
      ? findByRefusalReason(FOLLOW_UP_ERROR_KEY_BY_REASON, error.body)
      : undefined;
  return known ?? 'concerts.followUpFailed';
}

const SERVER_FAILURE_STATUS = 500;

export function isRetryableSignUpFailure(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= SERVER_FAILURE_STATUS;
}

const REGISTRATION_GONE_STATUS = 404;

export function isRegistrationGone(status: number): boolean {
  return status === REGISTRATION_GONE_STATUS;
}

export type SignUpStatus = 'idle' | 'pending' | 'error' | 'success';

export interface SignUpScreenParams {
  readonly status: SignUpStatus;
  readonly error: unknown;
  readonly hasOpened: boolean;
  readonly hasLeft: boolean;
}

export interface SignUpScreen {
  readonly overlay: OpeningOverlay | null;
  readonly error: SignUpError | null;
  readonly isAnswerShown: boolean;
}

function selectSettledOverlay(hasOpened: boolean, hasLeft: boolean): OpeningOverlay | null {
  return hasOpened && !hasLeft ? 'leaving' : null;
}

// @FollowsBlueprint core-message-selection
export function selectSignUpScreen(params: SignUpScreenParams): SignUpScreen {
  if (params.status === 'idle') return { overlay: null, error: null, isAnswerShown: false };
  if (params.status === 'pending') return { overlay: 'opening', error: null, isAnswerShown: false };
  if (params.status === 'error' && isRetryableSignUpFailure(params.error)) {
    return { overlay: 'opening-failed', error: null, isAnswerShown: false };
  }
  const overlay = selectSettledOverlay(params.hasOpened, params.hasLeft);
  const isAnswerShown = overlay === null;
  const error = params.status === 'error' && isAnswerShown ? selectSignUpError(params.error) : null;
  return { overlay, error, isAnswerShown };
}

export function buildSignUpPayload(values: SignUpFormValues): {
  readonly firstName: string;
  readonly email: string;
} {
  return { firstName: values.firstName.trim(), email: values.email.trim().toLowerCase() };
}

export function toggleChoice(current: string | null, picked: string): string | null {
  return current === picked ? null : picked;
}

export interface SearchLine {
  readonly messageKey: Exclude<SuggestionMessageKey, 'audience.suggestHint'>;
  readonly isFailure: boolean;
}

export function selectWishSearchLine(outcome: SuggestionOutcome): SearchLine | null {
  const { messageKey, isFailure } = outcome;
  if (messageKey === null || messageKey === 'audience.suggestHint') return null;
  return { messageKey, isFailure };
}

export const EMPTY_SIGN_UP: SignUpFormValues = { firstName: '', email: '' };

export function isSignUpSheetShown(isRequested: boolean, screen: SignUpScreen): boolean {
  if (screen.overlay !== null) return false;
  return isRequested || screen.error !== null;
}

export function selectErrorKeyAt(
  error: SignUpError | null,
  place: SignUpErrorPlace,
): SignUpErrorKey | null {
  return error?.place === place ? error.key : null;
}
