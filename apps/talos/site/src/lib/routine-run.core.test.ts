import { describe, expect, it } from 'vitest';
import { ROUTINE_RUN_LIST_PATH, selectTriggerLabelKey } from './routine-run.core';

// @FollowsBlueprint test-pure-unit
describe('the address of the run list', () => {
  it('is a screen of its own', () => {
    expect(ROUTINE_RUN_LIST_PATH).toBe('/runs');
  });
});

describe('selectTriggerLabelKey', () => {
  it.each([
    ['message', 'runs.trigger.message'],
    ['proposition', 'runs.trigger.proposition'],
  ] as const)('names what started a run fired by a %s', (trigger, labelKey) => {
    expect(selectTriggerLabelKey(trigger)).toBe(labelKey);
  });
});
