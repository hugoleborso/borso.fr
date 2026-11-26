/** @Feature concert-registrations */

import { z } from 'zod';
import type {
  SuggestionMessageKey,
  SuggestionOutcome,
} from '../../components/organisms/suggest-song.core';
import type { OpeningOverlay } from '../../components/organisms/session-gate.core';
import { ApiError } from '../../lib/api.client';

const FIRST_NAME_MAX_LENGTH = 60;
const EMAIL_MAX_LENGTH = 254;

export const FIRST_NAME_INPUT_MAX_LENGTH = FIRST_NAME_MAX_LENGTH;
export const EMAIL_INPUT_MAX_LENGTH = EMAIL_MAX_LENGTH;

export const signUpFormSchema = z.object({
  firstName: z.string().trim().min(1).max(FIRST_NAME_MAX_LENGTH),
  email: z.string().trim().max(EMAIL_MAX_LENGTH).pipe(z.email()),
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

function readRefusalReason(error: ApiError): string {
  const checked = refusalBodySchema.safeParse(error.body);
  return checked.success ? checked.data.error : '';
}

// @FollowsBlueprint core-label-key
export function selectSignUpError(error: unknown): SignUpError {
  const known =
    error instanceof ApiError ? SIGN_UP_ERROR_BY_REASON.get(readRefusalReason(error)) : undefined;
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
      ? FOLLOW_UP_ERROR_KEY_BY_REASON.get(readRefusalReason(error))
      : undefined;
  return known ?? 'concerts.followUpFailed';
}

const SERVER_FAILURE_STATUS = 500;

export function isRetryableSignUpFailure(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= SERVER_FAILURE_STATUS;
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

export type SignUpCardView = 'form' | 'registered' | 'thanked';

export function selectSignUpCardView(
  hasRegistration: boolean,
  hasAnsweredFollowUp: boolean,
): SignUpCardView {
  if (!hasRegistration) return 'form';
  return hasAnsweredFollowUp ? 'thanked' : 'registered';
}

export function selectErrorKeyAt(
  error: SignUpError | null,
  place: SignUpErrorPlace,
): SignUpErrorKey | null {
  return error?.place === place ? error.key : null;
}
