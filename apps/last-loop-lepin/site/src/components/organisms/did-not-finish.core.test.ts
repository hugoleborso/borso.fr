import { describe, expect, it } from 'vitest';
import type { RankedRunnerDto } from '../../lib/race.types';
import {
  selectMissedLoop,
  selectOutAtLoop,
  selectOutReasonKey,
  splitByDidNotFinish,
} from './did-not-finish.core';

function buildRunner(slug: string, status: RankedRunnerDto['status']): RankedRunnerDto {
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
    status,
    lastLoopDurationMs: null,
    lastFinishedAt: null,
  };
}

const RUNNING = buildRunner('alice', { kind: 'in-race', lastLoop: 3 });
const OUT_LATE = buildRunner('bob', { kind: 'dnf', outAtLoop: 2, reason: 'late' });
const OUT_MANUAL = buildRunner('carla', { kind: 'dnf', outAtLoop: 1, reason: 'manual' });

// @FollowsBlueprint test-pure-unit
describe('splitByDidNotFinish', () => {
  it('returns three empty lists for an empty field', () => {
    expect(splitByDidNotFinish([])).toEqual({
      awaitingConfirmation: [],
      allOut: [],
      stillRunning: [],
    });
  });

  it('lists only automatically projected runners as awaiting confirmation', () => {
    const lists = splitByDidNotFinish([RUNNING, OUT_LATE, OUT_MANUAL]);
    expect(lists.awaitingConfirmation.map((entry) => entry.runner.slug)).toEqual(['bob']);
  });

  it('lists every runner who stopped, however they stopped', () => {
    const lists = splitByDidNotFinish([RUNNING, OUT_LATE, OUT_MANUAL]);
    expect(lists.allOut.map((entry) => entry.runner.slug)).toEqual(['bob', 'carla']);
  });

  it('lists the runners still going', () => {
    const lists = splitByDidNotFinish([RUNNING, OUT_LATE]);
    expect(lists.stillRunning.map((entry) => entry.runner.slug)).toEqual(['alice']);
  });
});

describe('selectOutAtLoop', () => {
  it('returns the loop a stopped runner went out on', () => {
    expect(selectOutAtLoop(OUT_LATE)).toBe(2);
  });

  it('returns the last closed loop for a runner still going', () => {
    expect(selectOutAtLoop(RUNNING)).toBe(3);
  });
});

describe('selectMissedLoop', () => {
  it('credits the loop after the one the runner went out on', () => {
    expect(selectMissedLoop(OUT_LATE)).toBe(3);
  });
});

describe('selectOutReasonKey', () => {
  it('names a manual withdrawal', () => {
    expect(selectOutReasonKey(OUT_MANUAL)).toBe('admin.did-not-finish.reason-manual');
  });

  it('names an automatic exit', () => {
    expect(selectOutReasonKey(OUT_LATE)).toBe('admin.did-not-finish.reason-late');
  });

  it('falls back to the automatic reason for a runner still going', () => {
    expect(selectOutReasonKey(RUNNING)).toBe('admin.did-not-finish.reason-late');
  });
});
