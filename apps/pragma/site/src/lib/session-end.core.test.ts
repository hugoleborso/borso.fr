import { describe, expect, it } from 'vitest';
import { isEndedSessionBody, canAnswerEndedSession } from './session-end.core';

describe('canAnswerEndedSession', () => {
  it('holds for an unauthorised answer only', () => {
    expect(canAnswerEndedSession(401)).toBe(true);
    expect(canAnswerEndedSession(403)).toBe(false);
    expect(canAnswerEndedSession(200)).toBe(false);
  });
});

describe('isEndedSessionBody', () => {
  it.each(['session-required', 'session-invalid'])(
    'reads %s as a session the server no longer accepts',
    (error) => {
      expect(isEndedSessionBody({ error, reason: 'bad-signature' })).toBe(true);
    },
  );

  it.each(['invalid-credentials', 'invalid-password', 'ballot-required'])(
    'leaves the session alone on %s, a refusal of what was sent and not of who sent it',
    (error) => {
      expect(isEndedSessionBody({ error })).toBe(false);
    },
  );

  it.each([null, 'session-invalid', 401, { reason: 'bad-signature' }])(
    'leaves the session alone on a body that names no error: %j',
    (body) => {
      expect(isEndedSessionBody(body)).toBe(false);
    },
  );
});
