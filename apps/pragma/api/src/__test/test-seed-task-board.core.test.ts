import { describe, expect, it } from 'vitest';
import { SEED_MEMBERS, SEED_SONGS } from './test-seed-fixture.core';
import { SEED_TASKS } from './test-seed-task-board.core';

function isLate(dueInDays: number | null): boolean {
  return dueInDays !== null && dueInDays < 0;
}

// @FollowsBlueprint test-pure-unit
describe('the seeded task board', () => {
  it('names an assignee the fixture declares, or nobody', () => {
    const firstNames = new Set(SEED_MEMBERS.map((member) => member.firstName));
    for (const task of SEED_TASKS) {
      if (task.assigneeFirstName === null) continue;
      expect(firstNames).toContain(task.assigneeFirstName);
    }
  });

  it('points only at compositions, by title, and only at songs the fixture declares', () => {
    const originalTitles = new Set(
      SEED_SONGS.filter((song) => song.origin === 'original').map((song) => song.title),
    );
    for (const task of SEED_TASKS) {
      if (task.songTitle === null) continue;
      expect(originalTitles).toContain(task.songTitle);
    }
  });

  it('leaves one task unclaimed, so the unassigned column has a subject', () => {
    expect(SEED_TASKS.some((task) => task.assigneeFirstName === null)).toBe(true);
  });

  it('leaves one member with nothing owed, so an empty column is on screen', () => {
    const claimed = new Set(SEED_TASKS.map((task) => task.assigneeFirstName));
    expect(SEED_MEMBERS.some((member) => !claimed.has(member.firstName))).toBe(true);
  });

  it('carries an overdue open task and a late done one, which colour differently', () => {
    expect(SEED_TASKS.some((task) => isLate(task.dueInDays) && task.status !== 'done')).toBe(true);
    expect(SEED_TASKS.some((task) => isLate(task.dueInDays) && task.status === 'done')).toBe(true);
  });

  it('reaches every status the board draws', () => {
    expect(new Set(SEED_TASKS.map((task) => task.status))).toEqual(
      new Set(['todo', 'doing', 'done']),
    );
  });
});
