import { describe, expect, it } from 'vitest';
import { buildJoinCode, JOIN_CODE_ALPHABET, normalizeJoinCode } from './join-code.utils';
import { JOIN_CODE_LENGTH } from './games.schema';

// @FollowsBlueprint test-pure-unit
describe('buildJoinCode', () => {
  it('draws one character per position', () => {
    expect(buildJoinCode(() => 0)).toBe(JOIN_CODE_ALPHABET.charAt(0).repeat(JOIN_CODE_LENGTH));
  });

  it('never runs off the end of the alphabet', () => {
    const lastCharacter = JOIN_CODE_ALPHABET.charAt(JOIN_CODE_ALPHABET.length - 1);
    expect(buildJoinCode(() => 0.999_999)).toBe(lastCharacter.repeat(JOIN_CODE_LENGTH));
  });

  it('follows the draw it is given, position by position', () => {
    const draws = [0, 0.5, 0.25, 0.75];
    let cursor = 0;
    const code = buildJoinCode(() => {
      const value = draws[cursor] ?? 0;
      cursor += 1;
      return value;
    });
    expect(code).toHaveLength(JOIN_CODE_LENGTH);
    expect(new Set(code).size).toBeGreaterThan(1);
  });

  it('leaves out the characters a person reads back wrongly', () => {
    expect(JOIN_CODE_ALPHABET).not.toContain('I');
    expect(JOIN_CODE_ALPHABET).not.toContain('O');
    expect(JOIN_CODE_ALPHABET).not.toContain('0');
    expect(JOIN_CODE_ALPHABET).not.toContain('1');
  });
});

describe('normalizeJoinCode', () => {
  it('accepts a code typed in lower case', () => {
    expect(normalizeJoinCode('abcd')).toBe('ABCD');
  });

  it('drops the spaces and the punctuation a player types', () => {
    expect(normalizeJoinCode('  a b-c d ')).toBe('ABCD');
  });

  it('drops leading and trailing spaces', () => {
    expect(normalizeJoinCode('  ABCD  ')).toBe('ABCD');
  });
});
