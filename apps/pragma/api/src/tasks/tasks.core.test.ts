import { describe, expect, it } from 'vitest';
import { compareTasksByUrgency, sortTasksByUrgency, type TaskOrderingShape } from './tasks.core';

const EARLY = new Date('2026-01-10T00:00:00.000Z');
const LATE = new Date('2026-02-10T00:00:00.000Z');

function task(overrides: Partial<TaskOrderingShape> = {}): TaskOrderingShape {
  return { title: 'Task', status: 'todo', dueDate: null, ...overrides };
}

// @FollowsBlueprint test-pure-unit
describe('compareTasksByUrgency', () => {
  it('puts what is under way before what is waiting, and done last', () => {
    expect(compareTasksByUrgency(task({ status: 'doing' }), task({ status: 'todo' }))).toBeLessThan(
      0,
    );
    expect(compareTasksByUrgency(task({ status: 'todo' }), task({ status: 'done' }))).toBeLessThan(
      0,
    );
    expect(
      compareTasksByUrgency(task({ status: 'done' }), task({ status: 'doing' })),
    ).toBeGreaterThan(0);
  });

  it('breaks a tie on the nearest due date', () => {
    expect(compareTasksByUrgency(task({ dueDate: EARLY }), task({ dueDate: LATE }))).toBeLessThan(
      0,
    );
    expect(
      compareTasksByUrgency(task({ dueDate: LATE }), task({ dueDate: EARLY })),
    ).toBeGreaterThan(0);
  });

  it('sends a task with no due date behind every dated one', () => {
    expect(compareTasksByUrgency(task({ dueDate: null }), task({ dueDate: LATE }))).toBeGreaterThan(
      0,
    );
    expect(compareTasksByUrgency(task({ dueDate: EARLY }), task({ dueDate: null }))).toBeLessThan(
      0,
    );
    expect(compareTasksByUrgency(task({ dueDate: null }), task({ dueDate: null }))).toBe(0);
  });

  it('breaks a remaining tie on the title', () => {
    expect(compareTasksByUrgency(task({ title: 'Amp' }), task({ title: 'Strings' }))).toBeLessThan(
      0,
    );
    expect(compareTasksByUrgency(task({ title: 'Amp' }), task({ title: 'Amp' }))).toBe(0);
  });
});

describe('sortTasksByUrgency', () => {
  it('orders a board without touching the list it was given', () => {
    const given = [
      task({ title: 'Print setlists', status: 'done' }),
      task({ title: 'Buy strings', status: 'todo', dueDate: LATE }),
      task({ title: 'Book the van', status: 'todo', dueDate: EARLY }),
      task({ title: 'Mix the demo', status: 'doing' }),
    ];

    expect(sortTasksByUrgency(given).map((entry) => entry.title)).toEqual([
      'Mix the demo',
      'Book the van',
      'Buy strings',
      'Print setlists',
    ]);
    expect(given[0]?.title).toBe('Print setlists');
  });
});
