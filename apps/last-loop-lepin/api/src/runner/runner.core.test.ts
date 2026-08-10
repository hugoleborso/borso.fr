import { describe, expect, it } from 'vitest';
import type { LoopPunch } from '../punch/punch.types';
import { slugifyDisplayName, totalElapsedMs, validateRunnerDraft } from './runner.core';
import type { Runner } from './runner.types';

function buildRunner(slug: string, bib: number | null = null): Runner {
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

  it('accepts a clean draft', () => {
    const result = validateRunnerDraft({ displayName: 'Carla', slug: 'carla', bib: 3 }, baseRoster);
    expect(result.ok).toBe(true);
  });

  it('rejects empty display name', () => {
    const result = validateRunnerDraft(
      { displayName: '   ', slug: 'carla', bib: null },
      baseRoster,
    );
    expect(result).toEqual({ ok: false, reason: 'display-name-empty' });
  });

  it('rejects display name longer than 120 chars', () => {
    const result = validateRunnerDraft(
      { displayName: 'a'.repeat(121), slug: 'carla', bib: null },
      baseRoster,
    );
    expect(result).toEqual({ ok: false, reason: 'display-name-too-long' });
  });

  it('rejects slug shorter than 2 chars', () => {
    const result = validateRunnerDraft({ displayName: 'Carla', slug: 'a', bib: null }, baseRoster);
    expect(result).toEqual({ ok: false, reason: 'slug-too-short' });
  });

  it('rejects slug longer than 64 chars', () => {
    const result = validateRunnerDraft(
      { displayName: 'Carla', slug: 'a'.repeat(65), bib: null },
      baseRoster,
    );
    expect(result).toEqual({ ok: false, reason: 'slug-too-long' });
  });

  it('rejects slug with invalid chars', () => {
    const result = validateRunnerDraft(
      { displayName: 'Carla', slug: 'Carla!', bib: null },
      baseRoster,
    );
    expect(result).toEqual({ ok: false, reason: 'slug-invalid-chars' });
  });

  it('rejects slug starting or ending with dash', () => {
    expect(
      validateRunnerDraft({ displayName: 'C', slug: '-carla', bib: null }, baseRoster),
    ).toEqual({ ok: false, reason: 'slug-invalid-chars' });
    expect(
      validateRunnerDraft({ displayName: 'C', slug: 'carla-', bib: null }, baseRoster),
    ).toEqual({ ok: false, reason: 'slug-invalid-chars' });
  });

  it('accepts the slug slugifyDisplayName builds from a two-word name', () => {
    const slug = slugifyDisplayName('Jean-Luc Picard');
    expect(slug).toBe('jean-luc-picard');
    expect(validateRunnerDraft({ displayName: 'Jean-Luc Picard', slug, bib: null }, [])).toEqual({
      ok: true,
    });
  });

  it('gives the same verdict on a slug it is asked about twice', () => {
    const draft = { displayName: 'Carla', slug: 'carla!', bib: null };
    expect(validateRunnerDraft(draft, [])).toEqual(validateRunnerDraft(draft, []));
  });

  it('accepts a display name of exactly 120 chars', () => {
    const result = validateRunnerDraft(
      { displayName: 'a'.repeat(120), slug: 'carla', bib: null },
      baseRoster,
    );
    expect(result).toEqual({ ok: true });
  });

  it('accepts a slug of exactly 2 chars', () => {
    const result = validateRunnerDraft({ displayName: 'Carla', slug: 'ab', bib: null }, baseRoster);
    expect(result).toEqual({ ok: true });
  });

  it('accepts a slug of exactly 64 chars', () => {
    const result = validateRunnerDraft(
      { displayName: 'Carla', slug: 'a'.repeat(64), bib: null },
      baseRoster,
    );
    expect(result).toEqual({ ok: true });
  });

  it('rejects non-positive bib', () => {
    expect(
      validateRunnerDraft({ displayName: 'Carla', slug: 'carla', bib: 0 }, baseRoster),
    ).toEqual({ ok: false, reason: 'bib-not-positive' });
    expect(
      validateRunnerDraft({ displayName: 'Carla', slug: 'carla', bib: -5 }, baseRoster),
    ).toEqual({ ok: false, reason: 'bib-not-positive' });
  });

  it('rejects non-integer bib', () => {
    const result = validateRunnerDraft(
      { displayName: 'Carla', slug: 'carla', bib: 3.5 },
      baseRoster,
    );
    expect(result).toEqual({ ok: false, reason: 'bib-not-positive' });
  });

  it('rejects bib already taken by another runner in the same edition', () => {
    const result = validateRunnerDraft({ displayName: 'Carla', slug: 'carla', bib: 1 }, baseRoster);
    expect(result).toEqual({ ok: false, reason: 'bib-already-taken' });
  });

  it('allows a null bib regardless of roster', () => {
    const result = validateRunnerDraft(
      { displayName: 'Carla', slug: 'carla', bib: null },
      baseRoster,
    );
    expect(result.ok).toBe(true);
  });
});

// @FollowsBlueprint test-pure-unit
describe('totalElapsedMs', () => {
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
    expect(totalElapsedMs('alice', start, [])).toBe(0);
  });

  it('returns elapsed ms from start to the last valid punch', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:55:00+02:00'),
      buildPunch('alice', 2, '2026-09-19T07:55:00+02:00'),
    ];
    const expectedMs = new Date('2026-09-19T07:55:00+02:00').getTime() - start.getTime();
    expect(totalElapsedMs('alice', start, punches)).toBe(expectedMs);
  });

  it('ignores voided punches', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:55:00+02:00'),
      buildPunch('alice', 2, '2026-09-19T07:55:00+02:00', '2026-09-19T08:00:00+02:00'),
    ];
    const expectedMs = new Date('2026-09-19T06:55:00+02:00').getTime() - start.getTime();
    expect(totalElapsedMs('alice', start, punches)).toBe(expectedMs);
  });

  it('ignores other runners', () => {
    const punches = [
      buildPunch('alice', 1, '2026-09-19T06:55:00+02:00'),
      buildPunch('bob', 2, '2026-09-19T07:55:00+02:00'),
    ];
    const expectedMs = new Date('2026-09-19T06:55:00+02:00').getTime() - start.getTime();
    expect(totalElapsedMs('alice', start, punches)).toBe(expectedMs);
  });
});
