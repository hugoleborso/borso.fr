import { describe, expect, it } from 'vitest';
import { initialsAvatar } from './initials.utils';

describe('initialsAvatar', () => {
  it('takes the first two letters of a single-word name', () => {
    expect(initialsAvatar('Hugo').initials).toBe('HU');
  });

  it('takes first letters of first and last word for multi-word names', () => {
    expect(initialsAvatar('Hugo Le Borso').initials).toBe('HB');
  });

  it('handles two-word names', () => {
    expect(initialsAvatar('Marie Dupont').initials).toBe('MD');
  });

  it('preserves diacritics in initials', () => {
    expect(initialsAvatar('Éloïse Aïn').initials).toBe('ÉA');
  });

  it('collapses multiple whitespace', () => {
    expect(initialsAvatar('  Marie   Curie  ').initials).toBe('MC');
  });

  it('falls back to "??" for empty / whitespace-only input', () => {
    expect(initialsAvatar('').initials).toBe('??');
    expect(initialsAvatar('   ').initials).toBe('??');
  });

  it('is deterministic: same name produces same colour', () => {
    expect(initialsAvatar('Hugo').backgroundColor).toBe(initialsAvatar('Hugo').backgroundColor);
  });

  it('produces different colours for different names (collision is acceptable but exemplar inputs differ)', () => {
    const first = initialsAvatar('Hugo').backgroundColor;
    const second = initialsAvatar('Marie').backgroundColor;
    expect(first).not.toBe(second);
  });

  it('returns an OKLCH-formatted colour string', () => {
    const { backgroundColor } = initialsAvatar('Lucas');
    expect(backgroundColor).toMatch(/^oklch\([0-9.]+ [0-9.]+ [0-9]+(\.[0-9]+)?\)$/);
  });

  it('keeps the hue within [0, 360)', () => {
    const inputs = ['', 'a', 'longer name with several words', 'éàü', '!@#$%^&*()'];
    for (const input of inputs) {
      const match = initialsAvatar(input).backgroundColor.match(/oklch\([0-9.]+ [0-9.]+ ([0-9.]+)\)/);
      expect(match).not.toBeNull();
      const hue = Number.parseFloat(match?.[1] ?? '');
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('uppercases initials regardless of input casing', () => {
    expect(initialsAvatar('marie curie').initials).toBe('MC');
    expect(initialsAvatar('hugo').initials).toBe('HU');
  });
});
