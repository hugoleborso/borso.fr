import { describe, expect, it } from 'vitest';
import { GameError } from './game-error.types';
import { refuseInvalidInput } from './invalid-input.core';

// @FollowsBlueprint test-pure-unit
describe('refuseInvalidInput', () => {
  it('lets a valid input through', () => {
    expect(() => {
      refuseInvalidInput({ success: true });
    }).not.toThrow();
  });

  it('refuses an invalid input with the out of range code', () => {
    expect(() => {
      refuseInvalidInput({ success: false });
    }).toThrow(new GameError('value-out-of-range'));
  });
});
