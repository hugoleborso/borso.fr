import { describe, expect, it } from 'vitest';
import { TalosError } from '../helpers/errors/talos-error.types';
import {
  composeChangeResponse,
  describeFailure,
  readStoredResponse,
} from './memory-changes-response.core';

const RESULT = { index: 0, op: 'state.set', status: 'created' as const };

describe('composeChangeResponse', () => {
  it('counts the applied operations and marks each chunk', () => {
    expect(
      composeChangeResponse(
        [RESULT],
        [
          { from: 0, to: 0 },
          { from: 1, to: 1 },
        ],
        [true],
        null,
      ),
    ).toEqual({
      applied: 1,
      replayed: false,
      results: [RESULT],
      chunks: [
        { from: 0, to: 0, committed: true },
        { from: 1, to: 1, committed: false },
      ],
    });
  });

  it('carries the failure that stopped a later chunk', () => {
    expect(
      composeChangeResponse(
        [],
        [],
        [],
        new TalosError('memory-conflict', { message: 'source déjà écrite' }),
      ).error,
    ).toBe('source déjà écrite');
  });
});

describe('describeFailure', () => {
  it('names a refusal by its message, then its code, and hides anything else', () => {
    expect(describeFailure(new TalosError('memory-conflict'))).toBe('memory-conflict');
    expect(describeFailure(new Error('connection refused'))).toBe('erreur inattendue');
  });
});

describe('readStoredResponse', () => {
  it('replays a stored response marked as replayed', () => {
    const stored = JSON.stringify(
      composeChangeResponse([RESULT], [{ from: 0, to: 0 }], [true], null),
    );
    expect(readStoredResponse(stored)).toMatchObject({ applied: 1, replayed: true });
  });
});
