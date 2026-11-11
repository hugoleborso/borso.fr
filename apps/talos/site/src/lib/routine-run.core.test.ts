import { describe, expect, it } from 'vitest';
import {
  isRoutineUnconfigured,
  placeNewestRunFirst,
  selectTriggerLabelKey,
} from './routine-run.core';

// @FollowsBlueprint test-pure-unit
describe('isRoutineUnconfigured', () => {
  it('recognises the 503 the API answers while no fire url is set', () => {
    expect(isRoutineUnconfigured({ status: 503 })).toBe(true);
  });

  it.each([
    ['a failed fire', { status: 502 }],
    ['a failure without a status', new Error('réseau coupé')],
    ['no failure', null],
    ['a failure that is not an object', '503'],
  ])('leaves %s as it is', (_case, failure) => {
    expect(isRoutineUnconfigured(failure)).toBe(false);
  });
});

describe('placeNewestRunFirst', () => {
  it('puts the new run before the ones already listed', () => {
    expect(placeNewestRunFirst(['b', 'a'], 'c')).toEqual(['c', 'b', 'a']);
  });

  it('starts a list that was empty', () => {
    expect(placeNewestRunFirst([], 'a')).toEqual(['a']);
  });

  it('keeps the 20 most recent, dropping the oldest', () => {
    const listed = Array.from({ length: 20 }, (_unused, rank) => `run ${String(20 - rank)}`);
    const settled = placeNewestRunFirst(listed, 'run 21');
    expect(settled).toHaveLength(20);
    expect(settled.at(0)).toBe('run 21');
    expect(settled.at(-1)).toBe('run 2');
  });
});

describe('selectTriggerLabelKey', () => {
  it.each([
    ['message', 'message.runs.trigger.message'],
    ['proposition', 'message.runs.trigger.proposition'],
  ] as const)('names what started a run fired by a %s', (trigger, labelKey) => {
    expect(selectTriggerLabelKey(trigger)).toBe(labelKey);
  });
});
