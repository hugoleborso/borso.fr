import { describe, expect, it } from 'vitest';
import {
  foldReferenceText,
  isIdentifierReference,
  matchReference,
  type ReferenceCandidate,
} from './reference.core';

const SLOW_BURN: ReferenceCandidate = { id: 'song-1', label: 'Slow Burn', hint: 'The Embers' };
const SLOW_BURN_LIVE: ReferenceCandidate = { id: 'song-2', label: 'Slow Burn (live)' };
const RUNAWAY_SUN: ReferenceCandidate = { id: 'song-3', label: 'Runaway Sun' };
const LEA: ReferenceCandidate = { id: 'member-1', label: 'Léa' };
const CATALOGUE = [SLOW_BURN, SLOW_BURN_LIVE, RUNAWAY_SUN, LEA];

// @FollowsBlueprint test-pure-unit
describe('isIdentifierReference', () => {
  it('recognises a UUID in either case', () => {
    expect(isIdentifierReference('0947dbc8-abcc-410a-b7c5-024ac91beee5')).toBe(true);
    expect(isIdentifierReference('0947DBC8-ABCC-410A-B7C5-024AC91BEEE5')).toBe(true);
  });

  it('refuses a title, and a UUID with anything around it', () => {
    expect(isIdentifierReference('Slow Burn')).toBe(false);
    expect(isIdentifierReference(' 0947dbc8-abcc-410a-b7c5-024ac91beee5')).toBe(false);
    expect(isIdentifierReference('0947dbc8-abcc-410a-b7c5-024ac91beee5x')).toBe(false);
  });
});

describe('foldReferenceText', () => {
  it('drops accents and case, and collapses and trims spaces', () => {
    expect(foldReferenceText('  Léa   ÉTÉ  ')).toBe('lea ete');
  });
});

describe('matchReference', () => {
  it('finds a candidate by its id', () => {
    expect(matchReference(CATALOGUE, 'song-3')).toEqual({ kind: 'found', id: 'song-3' });
  });

  it('finds a label written without its accents or case', () => {
    expect(matchReference(CATALOGUE, 'lea')).toEqual({ kind: 'found', id: 'member-1' });
  });

  it('prefers the one exact label over the labels that only contain it', () => {
    expect(matchReference(CATALOGUE, 'slow burn')).toEqual({ kind: 'found', id: 'song-1' });
  });

  it('finds the one label containing a fragment', () => {
    expect(matchReference(CATALOGUE, 'runaway')).toEqual({ kind: 'found', id: 'song-3' });
  });

  it('answers every candidate a fragment fits when it fits several', () => {
    expect(matchReference(CATALOGUE, 'burn')).toEqual({
      kind: 'ambiguous',
      candidates: [SLOW_BURN, SLOW_BURN_LIVE],
    });
  });

  it('answers every candidate carrying the same exact label', () => {
    const twin = { id: 'song-9', label: 'slow burn' };
    expect(matchReference([SLOW_BURN, twin, SLOW_BURN_LIVE], 'Slow Burn')).toEqual({
      kind: 'ambiguous',
      candidates: [SLOW_BURN, twin],
    });
  });

  it('answers missing when nothing fits, and for a blank reference', () => {
    expect(matchReference(CATALOGUE, 'Creep')).toEqual({ kind: 'missing' });
    expect(matchReference(CATALOGUE, '   ')).toEqual({ kind: 'missing' });
  });
});
