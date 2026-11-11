import { describe, expect, it } from 'vitest';
import { countDueTasks, orderRecurringTasks } from './recurring-task-board.core';

const TASKS = [
  { id: 'calm-late', isDue: false, nextRunOn: '2026-12-01' },
  { id: 'due-late', isDue: true, nextRunOn: '2026-11-10' },
  { id: 'calm-soon', isDue: false, nextRunOn: '2026-11-05' },
  { id: 'due-soon', isDue: true, nextRunOn: '2026-11-08' },
];

describe('orderRecurringTasks', () => {
  it('puts the due tasks first, then the soonest next run, without touching its input', () => {
    const ordered = orderRecurringTasks(TASKS);
    expect(ordered.map((task) => task.id)).toStrictEqual([
      'due-soon',
      'due-late',
      'calm-soon',
      'calm-late',
    ]);
    expect(TASKS[0]?.id).toBe('calm-late');
  });

  it('keeps two due tasks in the order of their next run when they come sorted', () => {
    const ordered = orderRecurringTasks([
      { id: 'first', isDue: true, nextRunOn: '2026-11-01' },
      { id: 'second', isDue: true, nextRunOn: '2026-11-05' },
    ]);
    expect(ordered.map((task) => task.id)).toStrictEqual(['first', 'second']);
  });
});

describe('countDueTasks', () => {
  it('counts the tasks whose next run is reached', () => {
    expect(countDueTasks(TASKS)).toBe(2);
    expect(countDueTasks([])).toBe(0);
  });
});
