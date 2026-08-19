import { describe, expect, it } from 'vitest';
import { buildLineId, toSlug } from './openingIds.utils';

// @FollowsBlueprint test-pure-unit
describe('toSlug', () => {
  it('lowercases and hyphenates a name', () => {
    expect(toSlug('Ruy Lopez')).toBe('ruy-lopez');
  });

  it('drops both apostrophe shapes rather than hyphenating them', () => {
    expect(toSlug("Queen's Gambit")).toBe('queens-gambit');
    expect(toSlug('King’s Indian Defense')).toBe('kings-indian-defense');
  });

  it('collapses a run of separators into one hyphen', () => {
    expect(toSlug('Ruy Lopez: Closed, Breyer Defense')).toBe('ruy-lopez-closed-breyer-defense');
  });

  it('trims the hyphens a leading or trailing separator would leave', () => {
    expect(toSlug('!! Berlin Defense ??')).toBe('berlin-defense');
  });
});

describe('buildLineId', () => {
  it('suffixes the name slug with a fingerprint of the moves', () => {
    expect(buildLineId('Ruy Lopez: Closed', ['e2e4'])).toBe('ruy-lopez-closed-3dkpq076qfnvr');
  });

  it('fingerprints an empty move list', () => {
    expect(buildLineId('Ruy Lopez: Closed', [])).toBe('ruy-lopez-closed-33niihzj4ux45');
  });

  it('separates two identically named lines by their moves', () => {
    const shorter = buildLineId('Ruy Lopez: Closed', ['e2e4', 'e7e5', 'g1f3']);
    const longer = buildLineId('Ruy Lopez: Closed', ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
    expect(shorter).not.toBe(longer);
  });

  it('separates move lists that differ only in where the moves split', () => {
    expect(buildLineId('Line', ['e2e4', 'e7e5'])).not.toBe(buildLineId('Line', ['e2e4e7e5']));
  });

  it('returns the same id for the same inputs', () => {
    const moves = ['e2e4', 'c7c5', 'g1f3'];
    expect(buildLineId('Sicilian Defense', moves)).toBe(buildLineId('Sicilian Defense', moves));
  });
});
