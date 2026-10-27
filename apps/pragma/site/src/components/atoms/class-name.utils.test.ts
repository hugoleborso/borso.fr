import { describe, expect, it } from 'vitest';
import { composeClassName } from './class-name.utils';

// @FollowsBlueprint test-pure-unit
describe('composeClassName', () => {
  it('joins string class names with a space', () => {
    expect(composeClassName('a', 'b')).toBe('a b');
  });

  it('drops falsy entries', () => {
    expect(composeClassName('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('flattens conditional objects', () => {
    expect(composeClassName('base', { active: true, disabled: false })).toBe('base active');
  });

  it('flattens nested arrays', () => {
    expect(composeClassName(['a', ['b', { c: true }]], 'd')).toBe('a b c d');
  });

  it('returns an empty string when no inputs are truthy', () => {
    expect(composeClassName(false, null, undefined)).toBe('');
  });

  it('keeps the last of two classes that set the same property', () => {
    expect(composeClassName('w-full px-3', 'w-12')).toBe('px-3 w-12');
  });
});

describe('composeClassName with the design tokens', () => {
  it('keeps a text role beside a text colour', () => {
    expect(composeClassName('text-meta', 'text-ink')).toBe('text-meta text-ink');
    expect(composeClassName('text-ink-soft', 'text-label')).toBe('text-ink-soft text-label');
  });

  it('keeps the last of two text roles', () => {
    expect(composeClassName('text-meta', 'text-body')).toBe('text-body');
    expect(composeClassName('text-stage-title', 'text-stage-hero')).toBe('text-stage-hero');
  });

  it('keeps the last of two radii and of two shadows', () => {
    expect(composeClassName('rounded-pill', 'rounded-sheet')).toBe('rounded-sheet');
    expect(composeClassName('shadow-raised', 'shadow-overlay')).toBe('shadow-overlay');
  });
});
