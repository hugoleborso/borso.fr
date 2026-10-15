import { describe, expect, it } from 'vitest';
import {
  countReadySongs,
  indexInstrumentNames,
  readyShareInPercent,
  selectReadinessLabelKey,
  stepScore,
} from './studies-page.core';

// @FollowsBlueprint test-pure-unit
describe('studies-page.core', () => {
  it('counts the ready songs out of the total', () => {
    expect(countReadySongs([{ isReady: true }, { isReady: false }, { isReady: true }])).toEqual({
      ready: 2,
      total: 3,
    });
  });

  it('labels a known readiness and leaves an unknown one unlabelled', () => {
    expect(selectReadinessLabelKey(true)).toBe('studies.ready');
    expect(selectReadinessLabelKey(false)).toBe('studies.notReady');
    expect(selectReadinessLabelKey(null)).toBeNull();
  });

  it('computes the ready share in percent, zero for an empty concert', () => {
    expect(readyShareInPercent({ ready: 1, total: 4 })).toBe(25);
    expect(readyShareInPercent({ ready: 0, total: 0 })).toBe(0);
  });

  it('steps a score and clamps it to 0 and 10', () => {
    expect(stepScore(5, 1)).toBe(6);
    expect(stepScore(5, -1)).toBe(4);
    expect(stepScore(10, 1)).toBe(10);
    expect(stepScore(0, -1)).toBe(0);
    expect(stepScore(null, 1)).toBe(1);
  });

  it('indexes instrument names by id', () => {
    expect(indexInstrumentNames([{ id: 'guitar', name: 'Guitare' }]).get('guitar')).toBe('Guitare');
  });
});
