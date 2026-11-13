import { describe, expect, it } from 'vitest';
import {
  isSignedOutAnswer,
  isSuccessStatus,
  readAccountSession,
  readSignInFailure,
  SignInRefusedError,
  selectAccountLinkView,
  selectSignInFailure,
} from './account-session.core';

// @FollowsBlueprint test-pure-unit
describe('readSignInFailure', () => {
  it.each(['invalid-credentials', 'rate-limited', 'auth-not-bootstrapped'] as const)(
    'reads the refusal %s the API names',
    (refusal) => {
      expect(readSignInFailure({ error: refusal })).toBe(refusal);
    },
  );

  it.each([
    ['a validation error', { success: false }],
    ['an unknown refusal', { error: 'unexpected-failure' }],
    ['no body', null],
    ['a list', [{ error: 'rate-limited' }]],
  ])('answers unavailable for %s', (_reason, body) => {
    expect(readSignInFailure(body)).toBe('unavailable');
  });
});

describe('selectSignInFailure', () => {
  it('keeps the failure of a refused sign-in', () => {
    expect(selectSignInFailure(new SignInRefusedError('rate-limited'))).toBe('rate-limited');
  });

  it('answers unavailable when the request never reached the API', () => {
    expect(selectSignInFailure(new TypeError('Failed to fetch'))).toBe('unavailable');
  });

  it('names the failure in the error it throws', () => {
    expect(new SignInRefusedError('invalid-credentials')).toMatchObject({
      name: 'SignInRefusedError',
      message: 'The sign-in was refused: invalid-credentials.',
    });
  });
});

describe('selectAccountLinkView', () => {
  it('hides the link while the API has not answered, or never will', () => {
    expect(selectAccountLinkView(undefined)).toBe('hidden');
  });

  it('offers sign-in to a reader and sign-out to the operator', () => {
    expect(selectAccountLinkView({ signedIn: false })).toBe('signed-out');
    expect(selectAccountLinkView({ signedIn: true })).toBe('signed-in');
  });
});

describe('isSuccessStatus', () => {
  it('accepts 200 to 299 only', () => {
    expect(isSuccessStatus(199)).toBe(false);
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(299)).toBe(true);
    expect(isSuccessStatus(300)).toBe(false);
  });
});

describe('isSignedOutAnswer', () => {
  it('treats a 204 and a 401 as signed out, since an expired session is signed out already', () => {
    expect(isSignedOutAnswer(204)).toBe(true);
    expect(isSignedOutAnswer(401)).toBe(true);
    expect(isSignedOutAnswer(403)).toBe(false);
    expect(isSignedOutAnswer(500)).toBe(false);
  });
});

describe('readAccountSession', () => {
  it('reads the answer of the session route', () => {
    expect(readAccountSession({ signedIn: true })).toEqual({ signedIn: true });
    expect(readAccountSession({ signedIn: false })).toEqual({ signedIn: false });
  });

  it('answers null for a page that is not the API, such as the index served by a static host', () => {
    expect(readAccountSession({ signedIn: 'yes' })).toBeNull();
    expect(readAccountSession('<!doctype html>')).toBeNull();
  });
});
