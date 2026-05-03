import { describe, expect, it } from 'vitest';
import { buildSearch, freshSeed, readUrlState, seedToHex } from './url-state.utils';

describe('seedToHex', () => {
  it('produces an 8-char uppercase hex string', () => {
    expect(seedToHex(0)).toBe('00000000');
    expect(seedToHex(0xdeadbeef)).toBe('DEADBEEF');
    expect(seedToHex(0xffffffff)).toBe('FFFFFFFF');
  });

  it('coerces unsigned-32-bit to handle negative input', () => {
    expect(seedToHex(-1)).toBe('FFFFFFFF');
  });
});

describe('readUrlState', () => {
  it('returns a fresh seed and the default palette when the search is empty', () => {
    const state = readUrlState('', { paletteKey: 'classic' });
    expect(state.paletteKey).toBe('classic');
    expect(Number.isFinite(state.seed)).toBe(true);
    expect(state.seed).toBeGreaterThanOrEqual(0);
  });

  it('parses a valid ?seed=&palette= query', () => {
    const state = readUrlState('?seed=DEADBEEF&palette=nocturne', { paletteKey: 'classic' });
    expect(state.seed).toBe(0xdeadbeef);
    expect(state.paletteKey).toBe('nocturne');
  });

  it('falls back to a fresh seed when the seed is invalid hex', () => {
    const state = readUrlState('?seed=ZZZZ&palette=muted', { paletteKey: 'classic' });
    expect(state.seed).not.toBe(Number.NaN);
    expect(Number.isFinite(state.seed)).toBe(true);
    expect(state.paletteKey).toBe('muted');
  });

  it('falls back to a fresh seed when the seed is too long', () => {
    const state = readUrlState('?seed=DEADBEEF1', { paletteKey: 'classic' });
    expect(Number.isFinite(state.seed)).toBe(true);
  });

  it('falls back to the default palette when the palette is invalid', () => {
    const state = readUrlState('?seed=00000001&palette=fluorescent', { paletteKey: 'classic' });
    expect(state.seed).toBe(1);
    expect(state.paletteKey).toBe('classic');
  });

  it('falls back to a fresh seed when ?seed is missing', () => {
    const state = readUrlState('?palette=garden', { paletteKey: 'classic' });
    expect(Number.isFinite(state.seed)).toBe(true);
    expect(state.paletteKey).toBe('garden');
  });

  it('accepts custom as a palette key', () => {
    const state = readUrlState('?palette=custom', { paletteKey: 'classic' });
    expect(state.paletteKey).toBe('custom');
  });
});

describe('buildSearch', () => {
  it('round-trips through readUrlState for valid inputs', () => {
    const search = buildSearch({ seed: 0xdeadbeef, paletteKey: 'nocturne' });
    expect(search).toBe('?seed=DEADBEEF&palette=nocturne');
    const restored = readUrlState(search, { paletteKey: 'classic' });
    expect(restored).toStrictEqual({ seed: 0xdeadbeef, paletteKey: 'nocturne' });
  });

  it('preserves a zero seed', () => {
    const search = buildSearch({ seed: 0, paletteKey: 'classic' });
    expect(search).toBe('?seed=00000000&palette=classic');
  });
});

describe('freshSeed', () => {
  it('returns a finite non-negative integer in the 32-bit range', () => {
    for (let iteration = 0; iteration < 100; iteration++) {
      const seed = freshSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('rarely returns the same value twice in a short window', () => {
    const seeds = new Set<number>();
    for (let iteration = 0; iteration < 100; iteration++) seeds.add(freshSeed());
    expect(seeds.size).toBeGreaterThan(95);
  });
});
