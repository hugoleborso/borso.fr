import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api.client';
import {
  buildSignUpPayload,
  isRetryableSignUpFailure,
  selectErrorKeyAt,
  selectFollowUpErrorKey,
  isSignUpSheetShown,
  selectSignUpError,
  selectSignUpScreen,
  selectWishSearchLine,
  signUpFormSchema,
  toggleChoice,
} from './concert-sign-up.core';

// @FollowsBlueprint test-pure-unit
describe('the concert sign-up rules', () => {
  it.each([
    [
      new ApiError(409, 'conflict', { error: 'already-registered' }),
      'concerts.alreadyRegistered',
      'email',
    ],
    [
      new ApiError(422, 'throwaway', { error: 'disposable-email' }),
      'concerts.disposableEmail',
      'email',
    ],
    [
      new ApiError(422, 'past', { error: 'not-an-upcoming-concert' }),
      'concerts.notUpcoming',
      'form',
    ],
    [new ApiError(429, 'too many', { error: 'rate-limited' }), 'concerts.rateLimited', 'form'],
    [new ApiError(400, 'bad', null), 'concerts.signUpFailed', 'form'],
    [new Error('offline'), 'concerts.signUpFailed', 'form'],
  ] as const)('names the refusal %s', (error, key, place) => {
    expect(selectSignUpError(error)).toStrictEqual({ key, place });
  });

  it('offers a retry only when the server could not be reached or failed', () => {
    expect(isRetryableSignUpFailure(new TypeError('fetch failed'))).toBe(true);
    expect(isRetryableSignUpFailure(new ApiError(500, 'down', null))).toBe(true);
    expect(isRetryableSignUpFailure(new ApiError(499, 'odd', null))).toBe(false);
    expect(isRetryableSignUpFailure(new ApiError(409, 'conflict', null))).toBe(false);
  });

  it('shows the opening screen while the sign-up is in flight, and nothing at rest', () => {
    const base = { error: null, hasOpened: false, hasLeft: false };
    expect(selectSignUpScreen({ ...base, status: 'idle' })).toStrictEqual({
      overlay: null,
      error: null,
      isAnswerShown: false,
    });
    expect(selectSignUpScreen({ ...base, status: 'pending' })).toStrictEqual({
      overlay: 'opening',
      error: null,
      isAnswerShown: false,
    });
  });

  it('swaps to the failure screen when the request could not get through', () => {
    expect(
      selectSignUpScreen({
        status: 'error',
        error: new TypeError('x'),
        hasOpened: true,
        hasLeft: false,
      }),
    ).toStrictEqual({ overlay: 'opening-failed', error: null, isAnswerShown: false });
  });

  it('plays the exit before showing the answer, and skips it when no animation ever started', () => {
    const refused = new ApiError(409, 'conflict', { error: 'already-registered' });
    expect(
      selectSignUpScreen({ status: 'error', error: refused, hasOpened: true, hasLeft: false }),
    ).toStrictEqual({ overlay: 'leaving', error: null, isAnswerShown: false });
    expect(
      selectSignUpScreen({ status: 'error', error: refused, hasOpened: true, hasLeft: true }),
    ).toStrictEqual({
      overlay: null,
      error: { key: 'concerts.alreadyRegistered', place: 'email' },
      isAnswerShown: true,
    });
    expect(
      selectSignUpScreen({ status: 'success', error: null, hasOpened: false, hasLeft: false }),
    ).toStrictEqual({ overlay: null, error: null, isAnswerShown: true });
  });

  it('sends a trimmed first name and a trimmed lower-case email', () => {
    expect(buildSignUpPayload({ firstName: '  Léa ', email: ' Lea@Example.COM ' })).toStrictEqual({
      firstName: 'Léa',
      email: 'lea@example.com',
    });
  });

  it('accepts a first name and an email, and refuses a blank name or a bad email', () => {
    expect(signUpFormSchema.safeParse({ firstName: 'Léa', email: 'lea@example.com' }).success).toBe(
      true,
    );
    expect(signUpFormSchema.safeParse({ firstName: '   ', email: 'lea@example.com' }).success).toBe(
      false,
    );
    expect(signUpFormSchema.safeParse({ firstName: 'Léa', email: 'lea' }).success).toBe(false);
    expect(
      signUpFormSchema.safeParse({ firstName: 'L'.repeat(61), email: 'lea@example.com' }).success,
    ).toBe(false);
  });

  it('picks a choice, and drops it when picked again', () => {
    expect(toggleChoice(null, 'a')).toBe('a');
    expect(toggleChoice('a', 'b')).toBe('b');
    expect(toggleChoice('a', 'a')).toBeNull();
  });

  it('keeps the search quiet at rest and says why when it finds nothing or fails', () => {
    expect(selectWishSearchLine({ messageKey: null, isFailure: false })).toBeNull();
    expect(
      selectWishSearchLine({ messageKey: 'audience.suggestHint', isFailure: false }),
    ).toBeNull();
    expect(
      selectWishSearchLine({ messageKey: 'audience.searchUnavailable', isFailure: true }),
    ).toStrictEqual({ messageKey: 'audience.searchUnavailable', isFailure: true });
  });

  it('shows the sign-up sheet when asked, or to show a refusal, never over the opening screen', () => {
    const settled = { overlay: null, error: null, isAnswerShown: true } as const;
    const refused = {
      ...settled,
      error: { key: 'concerts.alreadyRegistered', place: 'email' },
    } as const;
    expect(isSignUpSheetShown(true, settled)).toBe(true);
    expect(isSignUpSheetShown(false, settled)).toBe(false);
    expect(isSignUpSheetShown(false, refused)).toBe(true);
    expect(isSignUpSheetShown(true, { ...settled, overlay: 'opening' })).toBe(false);
    expect(isSignUpSheetShown(false, { ...refused, overlay: 'leaving' })).toBe(false);
  });

  it('puts an email refusal under the email field and any other under the button', () => {
    const refusal = { key: 'concerts.disposableEmail', place: 'email' } as const;
    expect(selectErrorKeyAt(refusal, 'email')).toBe('concerts.disposableEmail');
    expect(selectErrorKeyAt(refusal, 'form')).toBeNull();
    expect(selectErrorKeyAt(null, 'email')).toBeNull();
  });

  it('names why the follow-up answer was refused', () => {
    expect(selectFollowUpErrorKey(null)).toBeNull();
    expect(selectFollowUpErrorKey(undefined)).toBeNull();
    expect(
      selectFollowUpErrorKey(new ApiError(403, 'x', { error: 'invalid-registration-token' })),
    ).toBe('concerts.followUpTokenRefused');
    expect(selectFollowUpErrorKey(new ApiError(422, 'x', { error: 'unknown-track' }))).toBe(
      'concerts.followUpTrackRefused',
    );
    expect(
      selectFollowUpErrorKey(new ApiError(503, 'x', { error: 'external-search-unavailable' })),
    ).toBe('concerts.followUpSearchUnavailable');
    expect(selectFollowUpErrorKey(new ApiError(422, 'x', { error: 'unknown-member' }))).toBe(
      'concerts.followUpFailed',
    );
    expect(selectFollowUpErrorKey(new Error('offline'))).toBe('concerts.followUpFailed');
  });
});
