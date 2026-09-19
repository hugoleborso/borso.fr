import { describe, expect, it } from 'vitest';
import { selectErrorResponse } from './error-response.core';
import { GameError } from './game-error.types';

// @FollowsBlueprint test-pure-unit
describe('selectErrorResponse', () => {
  it('answers a refusal with its own code and status', () => {
    expect(selectErrorResponse(new GameError('game-full'))).toEqual({
      body: { error: 'game-full' },
      status: 409,
    });
  });

  it('answers the status the code carries', () => {
    expect(selectErrorResponse(new GameError('game-not-found')).status).toBe(404);
  });

  it('answers an unexpected failure for any other error', () => {
    expect(selectErrorResponse(new Error('connection reset'))).toEqual({
      body: { error: 'unexpected-failure' },
      status: 500,
    });
  });

  it('never lets the message of an unexpected failure out', () => {
    expect(JSON.stringify(selectErrorResponse(new Error('secret')))).not.toContain('secret');
  });

  it('answers an unexpected failure for a thrown value that is not an error', () => {
    expect(selectErrorResponse('boom').body.error).toBe('unexpected-failure');
  });
});
