import { describe, expect, it } from 'vitest';
import { selectAdminCredentialsState, selectInstrumentIds } from './test-seed.core';

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
