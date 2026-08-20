import { describe, expect, it } from 'vitest';
import type { LoopPunch } from '../punch/punch.types';
import { slugifyDisplayName, elapsedSinceRaceStartMs, validateRunnerDraft } from './runner.core';
import type { Runner } from './runner.types';

function buildRunner(slug: string, bib: number): Runner {
  return {
    editionSlug: 'lepin-2026',
    slug,
    displayName: slug,
    photoKey: null,
    bib,
  };
}

// @FollowsBlueprint test-pure-unit
describe('slugifyDisplayName', () => {
  it('lowercases and replaces whitespace with dashes', () => {
    expect(slugifyDisplayName('Hugo Le Borso')).toBe('hugo-le-borso');
  });

  it('strips diacritics', () => {
    expect(slugifyDisplayName('Éloïse Aïn')).toBe('eloise-ain');
  });

  it('collapses runs of punctuation into a single dash', () => {
    expect(slugifyDisplayName("Marie-Hélène d'Aurillac")).toBe('marie-helene-d-aurillac');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugifyDisplayName('  ---Bob---  ')).toBe('bob');
  });

  it('caps at 64 characters', () => {
    const veryLong = 'a'.repeat(120);
    expect(slugifyDisplayName(veryLong).length).toBeLessThanOrEqual(64);
  });

  it('returns the empty string on whitespace-only input', () => {
    expect(slugifyDisplayName('   ')).toBe('');
  });
});

// @FollowsBlueprint test-pure-unit
describe('validateRunnerDraft', () => {
  const baseRoster = [buildRunner('alice', 1), buildRunner('bob', 2)];

  it('accepts a dash-free slug carrying a bib no one holds', () => {
    expect(validateRunnerDraft({ slug: 'carla', bib: 3 }, baseRoster)).toEqual({ ok: true });
  });

  it('rejects a slug starting with a dash', () => {
    expect(validateRunnerDraft({ slug: '-carla', bib: 3 }, baseRoster)).toEqual({
      ok: false,
      reason: 'slug-edge-dash',
    });
  });

  it('rejects a slug ending with a dash', () => {
    expect(validateRunnerDraft({ slug: 'carla-', bib: 3 }, baseRoster)).toEqual({
      ok: false,
      reason: 'slug-edge-dash',
    });
  });

  it('accepts the interior dashes slugifyDisplayName builds from a two-word name', () => {
    const slug = slugifyDisplayName('Jean-Luc Picard');
    expect(slug).toBe('jean-luc-picard');
    expect(validateRunnerDraft({ slug, bib: 3 }, baseRoster)).toEqual({ ok: true });
  });

  it('rejects a bib already taken by another runner in the same edition', () => {
    expect(validateRunnerDraft({ slug: 'carla', bib: 1 }, baseRoster)).toEqual({
      ok: false,
      reason: 'bib-already-taken',
    });
  });

  it('accepts any bib against an empty roster', () => {
    expect(validateRunnerDraft({ slug: 'carla', bib: 1 }, [])).toEqual({ ok: true });
  });
});

// @FollowsBlueprint test-pure-unit
describe('elapsedSinceRaceStartMs', () => {
  const start = new Date('2026-09-19T06:00:00+02:00');

  function buildPunch(
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

  it('returns 0 when the runner has no punches', () => {
    expect(elapsedSinceRaceStartMs('alice', start, [])).toBe(0);
  });

  it('returns elapsed ms from start to the last valid punch', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:55:00+02:00'),
      buildPunch('alice', 2, '2026-09-19T07:55:00+02:00'),
    ];
    const expectedMs = new Date('2026-09-19T07:55:00+02:00').getTime() - start.getTime();
    expect(elapsedSinceRaceStartMs('alice', start, punches)).toBe(expectedMs);
  });

  it('ignores voided punches', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:55:00+02:00'),
      buildPunch('alice', 2, '2026-09-19T07:55:00+02:00', '2026-09-19T08:00:00+02:00'),
    ];
    const expectedMs = new Date('2026-09-19T06:55:00+02:00').getTime() - start.getTime();
    expect(elapsedSinceRaceStartMs('alice', start, punches)).toBe(expectedMs);
  });

  it('ignores other runners', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:55:00+02:00'),
      buildPunch('bob', 2, '2026-09-19T07:55:00+02:00'),
    ];
    const expectedMs = new Date('2026-09-19T06:55:00+02:00').getTime() - start.getTime();
    expect(elapsedSinceRaceStartMs('alice', start, punches)).toBe(expectedMs);
  });
});
