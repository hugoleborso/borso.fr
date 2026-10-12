import { describe, expect, it } from 'vitest';
import { memberInitial } from './member-palette.utils';

// @FollowsBlueprint test-pure-unit
describe('memberInitial', () => {
  it('returns the first character uppercased', () => {
    expect(memberInitial('Hugo')).toBe('H');
    expect(memberInitial('gui')).toBe('G');
  });

  it('trims surrounding whitespace', () => {
    expect(memberInitial('  Arnaud')).toBe('A');
  });

  it('returns an empty string for an empty name', () => {
    expect(memberInitial('')).toBe('');
    expect(memberInitial('   ')).toBe('');
  });
});
