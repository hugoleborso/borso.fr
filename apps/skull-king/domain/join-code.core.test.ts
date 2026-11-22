import { describe, expect, it } from 'vitest';
import { isCompleteJoinCode, JOIN_CODE_LENGTH, normalizeJoinCode } from './join-code.core';

// @FollowsBlueprint test-pure-unit
describe('normalizeJoinCode', () => {
  it('accepts a code typed in lower case', () => {
    expect(normalizeJoinCode('abcd')).toBe('ABCD');
  });

  it('drops the spaces and the punctuation a player types', () => {
    expect(normalizeJoinCode('  a b-c d ')).toBe('ABCD');
  });

  it('keeps letters only, since a code holds no digit', () => {
    expect(normalizeJoinCode('ab23')).toBe('AB');
  });

  it('keeps every letter a code was ever made of, so the seeded BRIG still opens', () => {
    expect(normalizeJoinCode('brig')).toBe('BRIG');
  });
});

describe('isCompleteJoinCode', () => {
  it('accepts a code of exactly the join code length', () => {
    expect(isCompleteJoinCode('A'.repeat(JOIN_CODE_LENGTH))).toBe(true);
  });

  it('refuses a code still being typed', () => {
    expect(isCompleteJoinCode('A'.repeat(JOIN_CODE_LENGTH - 1))).toBe(false);
  });

  it('refuses a code one character too long', () => {
    expect(isCompleteJoinCode('A'.repeat(JOIN_CODE_LENGTH + 1))).toBe(false);
  });
});
