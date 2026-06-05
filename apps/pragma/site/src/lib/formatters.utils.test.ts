import { describe, expect, it } from 'vitest';
import { formatCapacity, formatSessionDate } from './formatters.utils';

describe('formatters.utils', () => {
  describe('formatSessionDate', () => {
    it('formats an ISO string in english', () => {
      const formatted = formatSessionDate('2025-09-13T18:30:00Z', 'en-GB');
      expect(formatted).toMatch(/Sat/);
      expect(formatted).toMatch(/2025/);
    });

    it('formats an ISO string in french', () => {
      const formatted = formatSessionDate('2025-09-13T18:30:00Z', 'fr-FR');
      expect(formatted).toMatch(/2025/);
    });

    it('returns the input untouched when the ISO string is malformed', () => {
      expect(formatSessionDate('not-a-date', 'en-GB')).toBe('not-a-date');
    });
  });

  describe('formatCapacity', () => {
    it('returns an em-dash on null', () => {
      expect(formatCapacity(null)).toBe('—');
    });

    it('returns an em-dash on undefined', () => {
      expect(formatCapacity(undefined)).toBe('—');
    });

    it('returns an em-dash on negative values', () => {
      expect(formatCapacity(-1)).toBe('—');
    });

    it('returns the digits on small numbers', () => {
      expect(formatCapacity(0)).toBe('0');
      expect(formatCapacity(120)).toBe('120');
    });

    it('groups thousands with a thin space', () => {
      expect(formatCapacity(1_200)).toBe('1 200');
      expect(formatCapacity(1_200_000)).toBe('1 200 000');
    });
  });
});
