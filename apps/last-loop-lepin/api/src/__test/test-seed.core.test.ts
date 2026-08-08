import { describe, expect, it } from 'vitest';
import { planSeedFixture } from './test-seed.core';

const NOW = new Date('2026-06-13T14:37:24.000Z');
const HOUR_MS = 60 * 60 * 1000;

describe('planSeedFixture', () => {
  it('starts the survivor fixture three whole hours before now, on a top of hour', () => {
    const plan = planSeedFixture('race-down-to-one-survivor', NOW);
    expect(plan.raceWindow.status).toBe('live');
    expect(plan.raceWindow.startsAt.getMinutes()).toBe(0);
    expect(plan.raceWindow.startsAt.getSeconds()).toBe(0);
    expect(plan.raceWindow.startsAt.getMilliseconds()).toBe(0);
    expect(NOW.getTime() - plan.raceWindow.startsAt.getTime()).toBeGreaterThanOrEqual(3 * HOUR_MS);
    expect(NOW.getTime() - plan.raceWindow.startsAt.getTime()).toBeLessThan(4 * HOUR_MS);
  });

  it('runs the survivor fixture for sixteen hours', () => {
    const plan = planSeedFixture('race-down-to-one-survivor', NOW);
    expect(plan.raceWindow.endsAt.getTime() - plan.raceWindow.startsAt.getTime()).toBe(
      16 * HOUR_MS,
    );
  });

  it('gives the survivor fixture three punches for alice and one late did-not-finish', () => {
    const plan = planSeedFixture('race-down-to-one-survivor', NOW);
    const alicePunches = plan.punches.filter((punch) => punch.runnerSlug === 'alice');
    expect(alicePunches.map((punch) => punch.loopIndex)).toEqual([1, 2, 3]);
    expect(plan.didNotFinishes).toEqual([
      {
        runnerSlug: 'dan',
        outAtLoop: 1,
        reason: 'late',
        decidedAt: new Date(plan.raceWindow.startsAt.getTime() + 2 * HOUR_MS),
      },
    ]);
  });

  it('orders every survivor punch strictly inside the race window', () => {
    const plan = planSeedFixture('race-down-to-one-survivor', NOW);
    for (const punch of plan.punches) {
      expect(punch.finishedAt.getTime()).toBeGreaterThan(plan.raceWindow.startsAt.getTime());
      expect(punch.finishedAt.getTime()).toBeLessThan(plan.raceWindow.endsAt.getTime());
    }
  });

  it('sets the top fixture two minutes past the last top of hour', () => {
    const plan = planSeedFixture('top-with-dnf-candidates', NOW);
    const startsAt = plan.raceWindow.startsAt;
    expect(startsAt.getMinutes()).toBe(58);
    expect(plan.raceWindow.status).toBe('live');
  });

  it('gives the top fixture one closed loop for alice and bob and nothing else', () => {
    const plan = planSeedFixture('top-with-dnf-candidates', NOW);
    expect(plan.punches.map((punch) => punch.runnerSlug)).toEqual(['alice', 'bob']);
    expect(plan.punches.every((punch) => punch.loopIndex === 1)).toBe(true);
    expect(plan.didNotFinishes).toEqual([]);
  });

  it('ends the finished fixture five minutes before now', () => {
    const plan = planSeedFixture('race-finished', NOW);
    expect(plan.raceWindow.status).toBe('finished');
    expect(NOW.getTime() - plan.raceWindow.endsAt.getTime()).toBe(5 * 60 * 1000);
    expect(plan.raceWindow.endsAt.getTime() - plan.raceWindow.startsAt.getTime()).toBe(
      16 * HOUR_MS,
    );
  });

  it('gives the finished fixture five alice loops, three bob loops, and one carla loop', () => {
    const plan = planSeedFixture('race-finished', NOW);
    const loopsBySlug = new Map<string, number[]>();
    for (const punch of plan.punches) {
      loopsBySlug.set(punch.runnerSlug, [
        ...(loopsBySlug.get(punch.runnerSlug) ?? []),
        punch.loopIndex,
      ]);
    }
    expect(loopsBySlug.get('alice')).toEqual([1, 2, 3, 4, 5]);
    expect(loopsBySlug.get('bob')).toEqual([1, 2, 3]);
    expect(loopsBySlug.get('carla')).toEqual([1]);
  });

  it('marks bob, carla, and dan out of the finished fixture', () => {
    const plan = planSeedFixture('race-finished', NOW);
    expect(plan.didNotFinishes.map((entry) => entry.runnerSlug)).toEqual(['bob', 'carla', 'dan']);
    expect(plan.didNotFinishes.map((entry) => entry.reason)).toEqual(['late', 'late', 'manual']);
    expect(plan.didNotFinishes.map((entry) => entry.outAtLoop)).toEqual([3, 1, 0]);
  });
});
