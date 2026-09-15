import { describe, expect, it } from 'vitest';
import {
  countOpenTasks,
  DEFAULT_TASK_STATUS,
  isTaskOpen,
  nextStatusAfterToggle,
} from './task-status.core';

// @FollowsBlueprint test-pure-unit
describe('task status', () => {
  it('treats everything but done as open', () => {
    expect(isTaskOpen({ status: 'todo' })).toBe(true);
    expect(isTaskOpen({ status: 'doing' })).toBe(true);
    expect(isTaskOpen({ status: 'done' })).toBe(false);
  });

  it('sends a checkbox back to the status a task starts at', () => {
    expect(nextStatusAfterToggle('done')).toBe(DEFAULT_TASK_STATUS);
    expect(nextStatusAfterToggle('todo')).toBe('done');
    expect(nextStatusAfterToggle('doing')).toBe('done');
  });

  it('counts what is left to do', () => {
    expect(countOpenTasks([{ status: 'todo' }, { status: 'done' }, { status: 'doing' }])).toBe(2);
    expect(countOpenTasks([])).toBe(0);
  });
});
