import { describe, expect, it } from 'vitest';
import type { LoopPunchDto } from '../../lib/race.types';
import { countValidPunches, listClosedLoops } from './runner-loop-history.core';

const RACE_START = '2026-06-13T04:00:00.000Z';
const HOUR_MS = 60 * 60 * 1000;

function buildPunch(overrides: Partial<LoopPunchDto> = {}): LoopPunchDto {
  return {
    id: 'punch-1',
    editionSlug: 'lepin-2026',
    runnerSlug: 'alice',
    loopIndex: 1,
    finishedAt: '2026-06-13T04:55:00.000Z',
    correctedAt: null,
    voidedAt: null,
    source: 'admin',
    clientLat: null,
    clientLng: null,
    clientAccuracyM: null,
    distanceFromCenterM: null,
    userAgent: null,
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('listClosedLoops', () => {
  it('returns nothing when the runner has no punch', () => {
    expect(listClosedLoops(RACE_START, [])).toEqual([]);
  });

  it('measures the first loop from the race start', () => {
    const loops = listClosedLoops(RACE_START, [buildPunch()]);
    expect(loops).toHaveLength(1);
    expect(loops[0]?.durationMs).toBe(55 * 60 * 1000);
  });

  it('measures each later loop from the previous one', () => {
    const loops = listClosedLoops(RACE_START, [
      buildPunch({ id: 'a', loopIndex: 1, finishedAt: '2026-06-13T05:00:00.000Z' }),
      buildPunch({ id: 'b', loopIndex: 2, finishedAt: '2026-06-13T06:00:00.000Z' }),
    ]);
    expect(loops.map((loop) => loop.durationMs)).toEqual([HOUR_MS, HOUR_MS]);
  });

  it('sorts punches that arrive out of order', () => {
    const loops = listClosedLoops(RACE_START, [
      buildPunch({ id: 'b', loopIndex: 2, finishedAt: '2026-06-13T06:00:00.000Z' }),
      buildPunch({ id: 'a', loopIndex: 1, finishedAt: '2026-06-13T05:00:00.000Z' }),
    ]);
    expect(loops.map((loop) => loop.loopIndex)).toEqual([1, 2]);
  });

  it('leaves cancelled punches out', () => {
    const loops = listClosedLoops(RACE_START, [
      buildPunch({ id: 'a', loopIndex: 1, voidedAt: '2026-06-13T05:10:00.000Z' }),
    ]);
    expect(loops).toEqual([]);
  });

  it('measures from the epoch when the race start is unknown', () => {
    const loops = listClosedLoops(undefined, [
      buildPunch({ finishedAt: '1970-01-01T00:01:00.000Z' }),
    ]);
    expect(loops[0]?.durationMs).toBe(60_000);
  });
});

describe('countValidPunches', () => {
  it('counts nothing for a runner with no punch', () => {
    expect(countValidPunches([])).toBe(0);
  });

  it('counts only punches that were not cancelled', () => {
    expect(
      countValidPunches([
        buildPunch({ id: 'a' }),
        buildPunch({ id: 'b', voidedAt: '2026-06-13T05:10:00.000Z' }),
        buildPunch({ id: 'c' }),
      ]),
    ).toBe(2);
  });
});
