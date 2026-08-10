import { describe, expect, it } from 'vitest';
import { buildTonalityLabel } from './tonality-label.utils';

// @FollowsBlueprint test-pure-unit
describe('buildTonalityLabel', () => {
  it('has no label when the song has no start key', () => {
    expect(buildTonalityLabel(null, 'D')).toBeNull();
  });

  it('names the start key alone when there is no end key', () => {
    expect(buildTonalityLabel('C', null)).toBe('C');
  });

  it('names the key once when the song stays in it', () => {
    expect(buildTonalityLabel('C', 'C')).toBe('C');
  });

  it('names both keys when the song modulates', () => {
    expect(buildTonalityLabel('C', 'D')).toBe('C → D');
  });
});
