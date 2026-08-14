import { describe, expect, it } from 'vitest';
import {
  buildSeedLineup,
  selectAdminCredentialsState,
  selectInstrumentIds,
} from './test-seed.core';

// @FollowsBlueprint test-pure-unit
describe('selectInstrumentIds', () => {
  const instrumentIdByName = new Map([
    ['Guitar', 'guitar-id'],
    ['Bass', 'bass-id'],
  ]);

  it('resolves every known name', () => {
    expect(selectInstrumentIds(['Guitar', 'Bass'], instrumentIdByName)).toEqual([
      'guitar-id',
      'bass-id',
    ]);
  });

  it('drops a name the seed never wrote', () => {
    expect(selectInstrumentIds(['Guitar', 'Theremin'], instrumentIdByName)).toEqual(['guitar-id']);
  });

  it('returns an empty list for an empty roster', () => {
    expect(selectInstrumentIds([], instrumentIdByName)).toEqual([]);
  });
});

describe('selectAdminCredentialsState', () => {
  it('reports created when the bootstrap wrote the row', () => {
    expect(selectAdminCredentialsState('ok')).toBe('created');
  });

  it('reports already-set when the row was there', () => {
    expect(selectAdminCredentialsState('already-bootstrapped')).toBe('already-set');
  });
});

describe('buildSeedLineup', () => {
  const memberIdByName = new Map([
    ['Hugo', 'hugo-id'],
    ['Léa', 'lea-id'],
  ]);
  const instrumentIdByName = new Map([
    ['Batterie', 'drums-id'],
    ['Chant', 'vocals-id'],
  ]);

  it('writes one entry per member, holding every instrument named', () => {
    expect(
      buildSeedLineup(
        { Hugo: ['Batterie', 'Chant'], Léa: ['Chant'] },
        memberIdByName,
        instrumentIdByName,
      ),
    ).toEqual({ 'hugo-id': ['drums-id', 'vocals-id'], 'lea-id': ['vocals-id'] });
  });

  it('drops a member the fixture never created', () => {
    expect(buildSeedLineup({ Marc: ['Chant'] }, memberIdByName, instrumentIdByName)).toEqual({});
  });

  it('keeps a member holding nothing the fixture knows, as sitting out', () => {
    expect(buildSeedLineup({ Hugo: ['Théremine'] }, memberIdByName, instrumentIdByName)).toEqual({
      'hugo-id': [],
    });
  });
});
