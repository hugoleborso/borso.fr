import { describe, expect, it } from 'vitest';
import type { RankedRunnerDto } from '../../lib/race.types';
import {
  composePunchTileClassName,
  countRunnersInRace,
  EMPTY_PUNCH_OVERLAY,
  listPunchTiles,
  projectPunchLoopClock,
  withoutPendingPunch,
  withPendingPunch,
} from './punch-panel.core';

const RACE_START = '2026-06-13T04:00:00.000Z';
const RACE_START_MS = new Date(RACE_START).getTime();
const HOUR_MS = 60 * 60 * 1000;

function buildRunner(slug: string, overrides: Partial<RankedRunnerDto> = {}): RankedRunnerDto {
  return {
    runner: {
      editionSlug: 'lepin-2026',
      slug,
      displayName: slug,
      photoKey: null,
      photoUrl: null,
      bib: 1,
    },
    rank: 1,
    status: { kind: 'in-race', lastLoop: 0 },
    lastLoopDurationMs: null,
    lastFinishedAt: null,
    ...overrides,
  };
}

describe('projectPunchLoopClock', () => {
  it('starts on loop one at the gun', () => {
    const clock = projectPunchLoopClock(RACE_START, 60, RACE_START_MS);
    expect(clock.currentLoopIndex).toBe(1);
    expect(clock.progressInLoop).toBe(0);
    expect(clock.minutesToNextTop).toBe(60);
  });

  it('clamps a time before the gun to the start', () => {
    const clock = projectPunchLoopClock(RACE_START, 60, RACE_START_MS - HOUR_MS);
    expect(clock.currentLoopIndex).toBe(1);
    expect(clock.progressInLoop).toBe(0);
  });

  it('reports the progress through the current loop', () => {
    const clock = projectPunchLoopClock(RACE_START, 60, RACE_START_MS + HOUR_MS / 2);
    expect(clock.progressInLoop).toBeCloseTo(0.5, 5);
    expect(clock.minutesToNextTop).toBe(30);
  });

  it('moves to the next loop on the top of the hour', () => {
    const clock = projectPunchLoopClock(RACE_START, 60, RACE_START_MS + HOUR_MS);
    expect(clock.currentLoopIndex).toBe(2);
  });

  it('treats an interval below one minute as one minute', () => {
    const clock = projectPunchLoopClock(RACE_START, 0, RACE_START_MS + 60_000);
    expect(clock.currentLoopIndex).toBe(2);
  });
});

describe('withPendingPunch', () => {
  it('records a runner against the loop being punched', () => {
    const overlay = withPendingPunch(EMPTY_PUNCH_OVERLAY, 3, 'alice');
    expect(overlay).toEqual({ loopIndex: 3, runnerSlugs: new Set(['alice']) });
  });

  it('keeps runners already recorded against the same loop', () => {
    const overlay = withPendingPunch(withPendingPunch(EMPTY_PUNCH_OVERLAY, 3, 'alice'), 3, 'bob');
    expect(overlay.runnerSlugs).toEqual(new Set(['alice', 'bob']));
  });

  it('drops runners recorded against an earlier loop', () => {
    const overlay = withPendingPunch(withPendingPunch(EMPTY_PUNCH_OVERLAY, 3, 'alice'), 4, 'bob');
    expect(overlay).toEqual({ loopIndex: 4, runnerSlugs: new Set(['bob']) });
  });
});

describe('withoutPendingPunch', () => {
  it('removes a runner from the current loop', () => {
    const overlay = withoutPendingPunch(
      withPendingPunch(EMPTY_PUNCH_OVERLAY, 3, 'alice'),
      3,
      'alice',
    );
    expect(overlay.runnerSlugs.size).toBe(0);
  });

  it('leaves an empty overlay for a loop that recorded nothing', () => {
    const overlay = withoutPendingPunch(EMPTY_PUNCH_OVERLAY, 3, 'alice');
    expect(overlay).toEqual({ loopIndex: 3, runnerSlugs: new Set() });
  });
});

describe('listPunchTiles', () => {
  const clock = projectPunchLoopClock(RACE_START, 60, RACE_START_MS + HOUR_MS / 2);

  it('skips runners who are out of the race', () => {
    const out = buildRunner('dan', { status: { kind: 'dnf', outAtLoop: 1, reason: 'late' } });
    expect(listPunchTiles([out], clock, EMPTY_PUNCH_OVERLAY)).toEqual([]);
  });

  it('marks a runner the server already credited as punched', () => {
    const credited = buildRunner('alice', { status: { kind: 'in-race', lastLoop: 1 } });
    const tiles = listPunchTiles([credited], clock, EMPTY_PUNCH_OVERLAY);
    expect(tiles[0]?.isPunched).toBe(true);
    expect(tiles[0]?.closedLoopCount).toBe(1);
  });

  it('marks a runner whose tap is still in flight as punched', () => {
    const waiting = buildRunner('bob');
    const overlay = withPendingPunch(EMPTY_PUNCH_OVERLAY, 1, 'bob');
    expect(listPunchTiles([waiting], clock, overlay)[0]?.isPunched).toBe(true);
  });

  it('ignores an overlay entry recorded against another loop', () => {
    const waiting = buildRunner('bob');
    const overlay = withPendingPunch(EMPTY_PUNCH_OVERLAY, 9, 'bob');
    expect(listPunchTiles([waiting], clock, overlay)[0]?.isPunched).toBe(false);
  });

  it('does not call a runner late half way through the loop', () => {
    expect(listPunchTiles([buildRunner('bob')], clock, EMPTY_PUNCH_OVERLAY)[0]?.isLate).toBe(false);
  });

  it('calls an unpunched runner late close to the top of the hour', () => {
    const lateClock = projectPunchLoopClock(RACE_START, 60, RACE_START_MS + 0.9 * HOUR_MS);
    expect(listPunchTiles([buildRunner('bob')], lateClock, EMPTY_PUNCH_OVERLAY)[0]?.isLate).toBe(
      true,
    );
  });

  it('never calls a punched runner late', () => {
    const lateClock = projectPunchLoopClock(RACE_START, 60, RACE_START_MS + 0.9 * HOUR_MS);
    const credited = buildRunner('alice', { status: { kind: 'in-race', lastLoop: 1 } });
    expect(listPunchTiles([credited], lateClock, EMPTY_PUNCH_OVERLAY)[0]?.isLate).toBe(false);
  });
});

describe('composePunchTileClassName', () => {
  it('leaves the tile bare when the runner is neither punched nor late', () => {
    expect(composePunchTileClassName(false, false)).toBe('punch-tile');
  });

  it('adds the punched modifier', () => {
    expect(composePunchTileClassName(true, false)).toBe('punch-tile punched');
  });

  it('adds the late modifier', () => {
    expect(composePunchTileClassName(false, true)).toBe('punch-tile late');
  });

  it('adds both modifiers when both hold', () => {
    expect(composePunchTileClassName(true, true)).toBe('punch-tile punched late');
  });
});

describe('countRunnersInRace', () => {
  it('counts nobody in an empty field', () => {
    expect(countRunnersInRace([])).toBe(0);
  });

  it('counts only the runners still going', () => {
    const out = buildRunner('dan', { status: { kind: 'dnf', outAtLoop: 1, reason: 'late' } });
    expect(countRunnersInRace([buildRunner('alice'), out])).toBe(1);
  });
});
