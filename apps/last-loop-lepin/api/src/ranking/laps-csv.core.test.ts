import { describe, expect, it } from 'vitest';
import type { RaceEdition } from '../edition/edition.types';
import type { LoopPunch } from '../punch/punch.types';
import type { Runner } from '../runner/runner.types';
import { formatLoopDuration, renderLapsCsv } from './laps-csv.core';
import type { RankedRunner } from './ranking.types';

const EDITION: RaceEdition = {
  slug: 'lepin-2026',
  displayName: '2026',
  // 4-hour race, 60-min interval → totalHourlyTops === 4.
  startsAt: new Date('2026-09-19T06:00:00+02:00'),
  endsAt: new Date('2026-09-19T10:00:00+02:00'),
  sunriseAt: new Date('2026-09-19T07:15:00+02:00'),
  sunsetAt: new Date('2026-09-19T19:45:00+02:00'),
  intervalMinutes: 60,
  gpx: {
    distanceMeters: 5800,
    elevationGainMeters: 250,
    trackJson: { points: [{ lat: 45.55, lng: 5.78 }] },
    startLatLng: { lat: 45.55, lng: 5.78 },
  },
  status: 'finished',
};

const ALICE: Runner = {
  editionSlug: 'lepin-2026',
  slug: 'alice',
  displayName: 'Alice',
  photoKey: null,
  bib: 1,
};
const BOB_QUOTED: Runner = {
  editionSlug: 'lepin-2026',
  slug: 'bob',
  displayName: 'Bob "Le Vieux", Coureur',
  photoKey: null,
  bib: 2,
};
const NO_BIB: Runner = {
  editionSlug: 'lepin-2026',
  slug: 'orphan',
  displayName: 'Orphan',
  photoKey: null,
  bib: null,
};

function punch(
  runnerSlug: string,
  loopIndex: number,
  finishedAtIso: string,
  voidedAtIso: string | null = null,
): LoopPunch {
  return {
    id: `${runnerSlug}-${loopIndex}`,
    editionSlug: 'lepin-2026',
    runnerSlug,
    loopIndex,
    finishedAt: new Date(finishedAtIso),
    correctedAt: null,
    voidedAt: voidedAtIso === null ? null : new Date(voidedAtIso),
    source: 'admin',
    clientLat: null,
    clientLng: null,
    clientAccuracyM: null,
    distanceFromCenterM: null,
    userAgent: null,
  };
}

function rankedOf(runner: Runner, rank: RankedRunner['rank']): RankedRunner {
  return {
    runner,
    rank,
    status: { kind: 'in-race', lastLoop: 1 },
    lastLoopDurationMs: null,
    lastFinishedAt: null,
  };
}

describe('formatLoopDuration', () => {
  it('returns the empty string for null', () => {
    expect(formatLoopDuration(null)).toBe('');
  });

  it('returns the empty string for negative ms (clock-skew degenerate)', () => {
    expect(formatLoopDuration(-1)).toBe('');
  });

  it('formats zero as 00:00', () => {
    expect(formatLoopDuration(0)).toBe('00:00');
  });

  it('zero-pads single-digit minutes and seconds', () => {
    expect(formatLoopDuration(5 * 60_000 + 7_000)).toBe('05:07');
  });

  it('floors sub-second remainders so 59.9s stays 00:59 and never rolls to 01:00', () => {
    expect(formatLoopDuration(59_900)).toBe('00:59');
  });

  it('formats a typical 58:14 loop without an hour prefix', () => {
    expect(formatLoopDuration(58 * 60_000 + 14_000)).toBe('58:14');
  });

  it('switches to Hh MM:SS at the 60-minute mark', () => {
    expect(formatLoopDuration(60 * 60_000)).toBe('1h00:00');
  });

  it('keeps minutes-within-the-hour zero-padded past the hour mark', () => {
    expect(formatLoopDuration(60 * 60_000 + 2 * 60_000 + 13_000)).toBe('1h02:13');
  });

  it('handles multi-hour durations', () => {
    expect(formatLoopDuration(3 * 60 * 60_000 + 45 * 60_000 + 6_000)).toBe('3h45:06');
  });
});

describe('renderLapsCsv', () => {
  it('emits a header row with bib, slug, name and one column per scheduled loop', () => {
    const csv = renderLapsCsv(EDITION, [], []);
    expect(csv).toBe('bib,runner_slug,display_name,B1,B2,B3,B4\n\n');
  });

  it('renders a single-runner full-race row with formatted loop durations', () => {
    // Loops start on the hour. Alice clears each loop 5 min before the
    // next top → every cell should be 55:00.
    const punches: readonly LoopPunch[] = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      punch('alice', 2, '2026-09-19T07:55:00+02:00'),
      punch('alice', 3, '2026-09-19T08:55:00+02:00'),
      punch('alice', 4, '2026-09-19T09:55:00+02:00'),
    ];
    const csv = renderLapsCsv(EDITION, [rankedOf(ALICE, 1)], punches);
    expect(csv).toBe(
      'bib,runner_slug,display_name,B1,B2,B3,B4\n1,alice,"Alice",55:00,55:00,55:00,55:00\n',
    );
  });

  it('leaves cells empty when a runner has no punch for that loop', () => {
    const punches = [
      punch('alice', 1, '2026-09-19T06:55:00+02:00'),
      // No punch for loops 2 / 3, then one for 4 (gap → DNF upstream,
      // but the CSV still reports the raw loop times).
      punch('alice', 4, '2026-09-19T09:55:00+02:00'),
    ];
    const csv = renderLapsCsv(EDITION, [rankedOf(ALICE, 1)], punches);
    expect(csv).toBe('bib,runner_slug,display_name,B1,B2,B3,B4\n1,alice,"Alice",55:00,,,55:00\n');
  });

  it('treats voided punches as missing — the cell stays empty', () => {
    const punches = [punch('alice', 1, '2026-09-19T06:55:00+02:00', '2026-09-19T07:00:00+02:00')];
    const csv = renderLapsCsv(EDITION, [rankedOf(ALICE, 1)], punches);
    expect(csv).toBe('bib,runner_slug,display_name,B1,B2,B3,B4\n1,alice,"Alice",,,,\n');
  });

  it('escapes display names that contain commas and quotes per RFC 4180', () => {
    const csv = renderLapsCsv(EDITION, [rankedOf(BOB_QUOTED, 1)], []);
    expect(csv).toBe(
      'bib,runner_slug,display_name,B1,B2,B3,B4\n2,bob,"Bob ""Le Vieux"", Coureur",,,,\n',
    );
  });

  it('leaves the bib cell empty when a runner has no bib assigned', () => {
    const csv = renderLapsCsv(EDITION, [rankedOf(NO_BIB, 1)], []);
    expect(csv).toBe('bib,runner_slug,display_name,B1,B2,B3,B4\n,orphan,"Orphan",,,,\n');
  });

  it('preserves the ranked order — finishers above DNFs, regardless of slug alphabetic order', () => {
    const csv = renderLapsCsv(EDITION, [rankedOf(BOB_QUOTED, 1), rankedOf(ALICE, 2)], []);
    const lines = csv.split('\n');
    expect(lines[1]?.startsWith('2,bob,')).toBe(true);
    expect(lines[2]?.startsWith('1,alice,')).toBe(true);
  });

  it('drops a clock-skew degenerate punch (finishedAt before loop top) to an empty cell', () => {
    // Loop 2 starts at 07:00; a punch stamped 06:30 lands before that
    // top-of-hour and `loopDurationMs` returns `null`.
    const punches = [punch('alice', 2, '2026-09-19T06:30:00+02:00')];
    const csv = renderLapsCsv(EDITION, [rankedOf(ALICE, 1)], punches);
    expect(csv).toBe('bib,runner_slug,display_name,B1,B2,B3,B4\n1,alice,"Alice",,,,\n');
  });
});
