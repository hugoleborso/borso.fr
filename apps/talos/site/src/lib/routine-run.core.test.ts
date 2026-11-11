import { describe, expect, it } from 'vitest';
import {
  isRoutineConfigured,
  isRunListAddressed,
  placeNewestRunFirst,
  ROUTINE_RUN_LIST_ID,
  ROUTINE_RUN_LIST_PATH,
  selectTriggerLabelKey,
} from './routine-run.core';

// @FollowsBlueprint test-pure-unit
describe('the address of the run list', () => {
  it('points at the list of the Message screen', () => {
    expect(ROUTINE_RUN_LIST_ID).toBe('runs');
    expect(ROUTINE_RUN_LIST_PATH).toBe('/message#runs');
    expect(isRunListAddressed('#runs')).toBe(true);
    expect(isRunListAddressed('')).toBe(false);
  });
});

describe('isRoutineConfigured', () => {
  it('reads the 503 the API answers while no fire url is set as a routine not configured', () => {
    expect(isRoutineConfigured({ status: 503 })).toBe(false);
  });

  it.each([
    ['a failed fire', { status: 502 }],
    ['a failure without a status', new Error('réseau coupé')],
    ['no failure', null],
    ['a failure that is not an object', '503'],
  ])('keeps the routine configured after %s', (_case, failure) => {
    expect(isRoutineConfigured(failure)).toBe(true);
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
