import { describe, expect, it } from 'vitest';
import { buildSearch, freshSeed, isSeedHex, readUrlState, seedToHex } from './url-state.utils';

const FALLBACK_SEED = 0x0000002a;

describe('isSeedHex', () => {
  it('accepts a single hex digit', () => {
    expect(isSeedHex('a')).toBe(true);
  });

  it('accepts the eight digits a full 32-bit seed needs', () => {
    expect(isSeedHex('DEADBEEF')).toBe(true);
  });

  it('rejects a ninth digit, which no 32-bit seed can use', () => {
    expect(isSeedHex('DEADBEEF1')).toBe(false);
  });

  it('rejects digits outside the hexadecimal alphabet', () => {
    expect(isSeedHex('ZZZZ')).toBe(false);
  });

  it('rejects an empty value', () => {
    expect(isSeedHex('')).toBe(false);
  });

  it('rejects hex digits preceded by anything else', () => {
    expect(isSeedHex('zz12')).toBe(false);
  });

  it('rejects hex digits followed by anything else', () => {
    expect(isSeedHex('12zz')).toBe(false);
  });
});

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
    const state = readUrlState('', { paletteKey: 'classic', fallbackSeed: FALLBACK_SEED });
    expect(state.paletteKey).toBe('classic');
    expect(Number.isFinite(state.seed)).toBe(true);
    expect(state.seed).toBeGreaterThanOrEqual(0);
  });

  it('parses a valid ?seed=&palette= query', () => {
    const state = readUrlState('?seed=DEADBEEF&palette=nocturne', {
      paletteKey: 'classic',
      fallbackSeed: FALLBACK_SEED,
    });
    expect(state.seed).toBe(0xdeadbeef);
    expect(state.paletteKey).toBe('nocturne');
  });

  it("falls back to the caller's seed when the seed is invalid hex", () => {
    const state = readUrlState('?seed=ZZZZ&palette=muted', {
      paletteKey: 'classic',
      fallbackSeed: FALLBACK_SEED,
    });
    expect(state.seed).toBe(FALLBACK_SEED);
    expect(state.paletteKey).toBe('muted');
  });

  it("falls back to the caller's seed when the seed in the URL is empty", () => {
    const state = readUrlState('?seed=&palette=muted', {
      paletteKey: 'classic',
      fallbackSeed: FALLBACK_SEED,
    });
    expect(state.seed).toBe(FALLBACK_SEED);
  });

  it("falls back to the caller's seed when the seed in the URL is too long", () => {
    const state = readUrlState('?seed=DEADBEEF1', {
      paletteKey: 'classic',
      fallbackSeed: FALLBACK_SEED,
    });
    expect(state.seed).toBe(FALLBACK_SEED);
  });

  it('falls back to the default palette when the palette is invalid', () => {
    const state = readUrlState('?seed=00000001&palette=fluorescent', {
      paletteKey: 'classic',
      fallbackSeed: FALLBACK_SEED,
    });
    expect(state.seed).toBe(1);
    expect(state.paletteKey).toBe('classic');
  });

  it("falls back to the caller's seed when the URL carries no seed", () => {
    const state = readUrlState('?palette=garden', {
      paletteKey: 'classic',
      fallbackSeed: FALLBACK_SEED,
    });
    expect(state.seed).toBe(FALLBACK_SEED);
    expect(state.paletteKey).toBe('garden');
  });

  it('accepts custom as a palette key', () => {
    const state = readUrlState('?palette=custom', {
      paletteKey: 'classic',
      fallbackSeed: FALLBACK_SEED,
    });
    expect(state.paletteKey).toBe('custom');
  });
});

describe('buildSearch', () => {
  it('round-trips through readUrlState for valid inputs', () => {
    const search = buildSearch({ seed: 0xdeadbeef, paletteKey: 'nocturne' });
    expect(search).toBe('?seed=DEADBEEF&palette=nocturne');
    const restored = readUrlState(search, { paletteKey: 'classic', fallbackSeed: FALLBACK_SEED });
    expect(restored).toStrictEqual({ seed: 0xdeadbeef, paletteKey: 'nocturne' });
  });

  it('preserves a zero seed', () => {
    const search = buildSearch({ seed: 0, paletteKey: 'classic' });
    expect(search).toBe('?seed=00000000&palette=classic');
  });
});

describe('freshSeed', () => {
  it('maps 0 to the lowest seed', () => {
    expect(freshSeed(0)).toBe(0);
  });

  it('maps the largest value below 1 to the highest seed', () => {
    expect(freshSeed(1 - Number.EPSILON)).toBe(0xffffffff);
  });

  it('returns a finite integer inside the 32-bit range for any unit interval value', () => {
    for (let step = 0; step <= 100; step++) {
      const seed = freshSeed(step / 101);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('is monotonic, so a larger unit interval never yields a smaller seed', () => {
    expect(freshSeed(0.25)).toBeLessThan(freshSeed(0.75));
  });
});
