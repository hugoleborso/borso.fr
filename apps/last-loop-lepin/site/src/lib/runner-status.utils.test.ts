import { describe, expect, it } from 'vitest';
import type { RankedRunnerDto, RunnerStatusDto } from './race.types';
import {
  countRunnersInRace,
  selectRunnerOutReason,
  selectRunnerStatusKind,
  selectRunnerStatusLoop,
} from './runner-status.utils';

const IN_RACE: RunnerStatusDto = { kind: 'in-race', lastLoop: 4 };
const OUT_LATE: RunnerStatusDto = { kind: 'dnf', outAtLoop: 2, reason: 'late' };
const OUT_MANUAL: RunnerStatusDto = { kind: 'dnf', outAtLoop: 3, reason: 'manual' };

function buildRankedRunner(slug: string, status: RunnerStatusDto): RankedRunnerDto {
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

// @FollowsBlueprint test-pure-unit
describe('selectRunnerStatusKind', () => {
  it('reports a running runner as in race', () => {
    expect(selectRunnerStatusKind(IN_RACE)).toBe('in-race');
  });

  it('reports a runner who stopped as out', () => {
    expect(selectRunnerStatusKind(OUT_LATE)).toBe('out');
  });
});

describe('selectRunnerStatusLoop', () => {
  it('returns the last closed loop of a running runner', () => {
    expect(selectRunnerStatusLoop(IN_RACE)).toBe(4);
  });

  it('returns the loop a stopped runner went out on', () => {
    expect(selectRunnerStatusLoop(OUT_LATE)).toBe(2);
  });
});

describe('selectRunnerOutReason', () => {
  it('returns the recorded reason for a runner who stopped', () => {
    expect(selectRunnerOutReason(OUT_MANUAL)).toBe('manual');
  });

  it('returns the automatic reason for a runner still going', () => {
    expect(selectRunnerOutReason(IN_RACE)).toBe('late');
  });
});

describe('countRunnersInRace', () => {
  it('counts nobody in an empty field', () => {
    expect(countRunnersInRace([])).toBe(0);
  });

  it('counts only the runners still going', () => {
    const field = [
      buildRankedRunner('alice', IN_RACE),
      buildRankedRunner('bob', IN_RACE),
      buildRankedRunner('dan', OUT_LATE),
    ];
    expect(countRunnersInRace(field)).toBe(2);
  });
});
