import { describe, expect, it } from 'vitest';
import { resolveLineup } from './lineup.core';

describe('resolveLineup', () => {
  it('returns the default when the override is null', () => {
    expect(resolveLineup({ hugo: 'guitar', gui: 'drums' }, null)).toEqual({
      hugo: 'guitar',
      gui: 'drums',
    });
  });

  it('keeps default members not mentioned in the override', () => {
    expect(resolveLineup({ hugo: 'guitar', gui: 'drums' }, { hugo: 'piano' })).toEqual({
      hugo: 'piano',
      gui: 'drums',
    });
  });

  it('respects an explicit null in the override (member sits out)', () => {
    expect(resolveLineup({ hugo: 'guitar' }, { hugo: null })).toEqual({ hugo: null });
  });

  it('adds members present only in the override', () => {
    expect(resolveLineup({ hugo: 'guitar' }, { gui: 'drums' })).toEqual({
      hugo: 'guitar',
      gui: 'drums',
    });
  });

  it('returns a new object — does not mutate the default', () => {
    const defaultLineup = { hugo: 'guitar' };
    const resolved = resolveLineup(defaultLineup, { hugo: 'piano' });
    expect(defaultLineup).toEqual({ hugo: 'guitar' });
    expect(resolved).toEqual({ hugo: 'piano' });
  });

  it('returns a fresh copy of the default when the override is null', () => {
    const defaultLineup = { hugo: 'guitar' };
    const resolved = resolveLineup(defaultLineup, null);
    expect(resolved).toEqual(defaultLineup);
    expect(resolved).not.toBe(defaultLineup);
  });
});
